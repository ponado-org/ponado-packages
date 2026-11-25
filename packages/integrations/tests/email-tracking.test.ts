import { generateKeyPairSync, sign } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import {
	EmailSendStatus,
	createEmailTracker,
	createSnsVerifier,
	normalizeEmailRecipient,
	normalizeSesMessageId,
	shouldApplyStatus,
	snsCanonicalString,
	type EmailSendLookup,
	type EmailStatusCounts,
	type EmailTrackingStore,
	type NewEmailEvent,
	type NewEmailSend
} from '../src/email/index.js';

const logger = { info: () => {}, warn: () => {}, error: () => {} };

type StoredSend = NewEmailSend & { id: number };

function createMemoryStore(seed: StoredSend[] = []) {
	const sends = [...seed];
	const events: Array<NewEmailEvent & { id: number }> = [];
	let nextSendId = seed.reduce((max, row) => Math.max(max, row.id), 0) + 1;
	let nextEventId = 1;

	const store: EmailTrackingStore = {
		async insertSend(input) {
			sends.push({ ...input, id: nextSendId++ });
		},
		async findByMessageId(messageId) {
			const row = sends.find((send) => send.messageId === messageId);
			if (!row) return null;
			const lookup: EmailSendLookup = {
				id: row.id,
				entityType: row.entityType,
				entityId: row.entityId,
				scopeType: row.scopeType,
				scopeId: row.scopeId,
				status: row.status,
				sentAt: row.sentAt,
				deliveredAt: null,
				bouncedAt: null,
				complainedAt: null,
				errorMessage: row.errorMessage
			};
			return lookup;
		},
		async updateStatus(id, patch) {
			const row = sends.find((send) => send.id === id);
			if (!row) return;
			row.status = patch.status;
			if (patch.sentAt) row.sentAt = patch.sentAt;
		},
		async insertEvent(input) {
			events.push({ ...input, id: nextEventId++ });
		},
		async latestForEntity() {
			return null;
		},
		async latestForScope() {
			return [];
		},
		async countsForScope() {
			return {
				[EmailSendStatus.PENDING]: 0,
				[EmailSendStatus.SENT]: 0,
				[EmailSendStatus.DELIVERED]: 0,
				[EmailSendStatus.BOUNCED]: 0,
				[EmailSendStatus.COMPLAINED]: 0,
				[EmailSendStatus.FAILED]: 0
			} satisfies EmailStatusCounts;
		},
		async eventsForSend(emailSendId) {
			return events.filter((event) => event.emailSendId === emailSendId);
		}
	};

	return { store, sends, events };
}

function sentRow(overrides: Partial<StoredSend> = {}): StoredSend {
	return {
		id: 1,
		entityType: 'invoice',
		entityId: '42',
		scopeType: 'batch',
		scopeId: 'b1',
		toEmail: 'someone@example.com',
		subject: 'Hello',
		status: EmailSendStatus.SENT,
		messageId: 'abc123',
		errorMessage: null,
		attemptCount: 1,
		sentAt: new Date('2026-01-01T00:00:00.000Z'),
		createdBy: 'user-1',
		metadata: null,
		createdAt: new Date('2026-01-01T00:00:00.000Z'),
		updatedAt: new Date('2026-01-01T00:00:00.000Z'),
		...overrides
	};
}

function snsNotification(message: unknown): Request {
	return new Request('http://localhost/api/email/events', {
		method: 'POST',
		headers: { 'content-type': 'text/plain' },
		body: JSON.stringify({ Type: 'Notification', Message: JSON.stringify(message) })
	});
}

const sesMail = {
	messageId: '<ABC123@email.amazonses.com>',
	timestamp: '2026-01-02T00:00:00.000Z'
};

describe('status model', () => {
	it('never downgrades a delivered or terminal status', () => {
		expect(shouldApplyStatus(EmailSendStatus.SENT, EmailSendStatus.DELIVERED)).toBe(true);
		expect(shouldApplyStatus(EmailSendStatus.DELIVERED, EmailSendStatus.SENT)).toBe(false);
		expect(shouldApplyStatus(EmailSendStatus.BOUNCED, EmailSendStatus.DELIVERED)).toBe(false);
		expect(shouldApplyStatus(EmailSendStatus.FAILED, EmailSendStatus.SENT)).toBe(false);
		expect(shouldApplyStatus(EmailSendStatus.BOUNCED, EmailSendStatus.COMPLAINED)).toBe(true);
	});
});

describe('message ids and recipients', () => {
	it('normalizes SES message ids to the local part', () => {
		expect(normalizeSesMessageId('<ABC123@email.amazonses.com>')).toBe('abc123');
		expect(normalizeSesMessageId('  > ')).toBeUndefined();
	});

	it('normalizes string, object and array recipients', () => {
		expect(normalizeEmailRecipient('a@example.com')).toBe('a@example.com');
		expect(normalizeEmailRecipient({ address: 'a@example.com', name: 'A' })).toBe(
			'a@example.com'
		);
		expect(
			normalizeEmailRecipient(['a@example.com', { address: 'b@example.com', name: 'B' }])
		).toBe('a@example.com, b@example.com');
	});
});

describe('SNS signature verification', () => {
	it('verifies a canonical signature and rejects a foreign cert host', async () => {
		const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
		const notification = {
			Type: 'Notification',
			Message: 'hello',
			MessageId: '1',
			Timestamp: '2026-01-01T00:00:00.000Z',
			TopicArn: 'arn:aws:sns:eu-north-1:123:test',
			SignatureVersion: '2',
			SigningCertURL: 'https://sns.eu-north-1.amazonaws.com/cert.pem'
		};
		const signature = sign(
			'RSA-SHA256',
			Buffer.from(snsCanonicalString(notification)),
			privateKey
		).toString('base64');

		const verifier = createSnsVerifier({ getPublicKey: async () => publicKey });
		await expect(verifier.verify({ ...notification, Signature: signature })).resolves.toBe(
			true
		);
		await expect(
			verifier.verify({
				...notification,
				Signature: signature,
				SigningCertURL: 'https://evil.example.com/cert.pem'
			})
		).resolves.toBe(false);
	});
});

describe('recordAttempt', () => {
	it('records a successful send and emits a status event', async () => {
		const { store, sends } = createMemoryStore();
		const onStatusChange = vi.fn();
		const tracker = createEmailTracker({
			store,
			logger,
			now: () => new Date('2026-01-01T00:00:00.000Z'),
			onStatusChange
		});

		await tracker.recordAttempt({
			props: {
				to: 'someone@example.com',
				subject: 'Hello',
				html: '<p>Hello</p>',
				meta: {
					entityType: 'invoice',
					entityId: '42',
					scopeType: 'batch',
					scopeId: 'b1',
					createdBy: 'user-1'
				}
			},
			result: { success: true, messageId: '<ABC123@email.amazonses.com>' }
		});

		expect(sends).toHaveLength(1);
		expect(sends[0]).toMatchObject({
			status: EmailSendStatus.SENT,
			messageId: 'abc123',
			toEmail: 'someone@example.com',
			entityType: 'invoice',
			entityId: '42',
			createdBy: 'user-1'
		});
		expect(onStatusChange).toHaveBeenCalledWith(
			expect.objectContaining({
				entityType: 'invoice',
				entityId: '42',
				emailSendInfo: expect.objectContaining({ status: EmailSendStatus.SENT })
			})
		);
	});

	it('ignores sends without tracking meta', async () => {
		const { store, sends } = createMemoryStore();
		const tracker = createEmailTracker({ store, logger });

		await tracker.recordAttempt({
			props: { to: 'someone@example.com', subject: 'Hello', html: '<p>Hello</p>' },
			result: { success: true, messageId: 'abc' }
		});

		expect(sends).toHaveLength(0);
	});
});

describe('SNS webhook', () => {
	it('applies a Delivery event and stores the provider event', async () => {
		const { store, sends, events } = createMemoryStore([sentRow()]);
		const onStatusChange = vi.fn();
		const tracker = createEmailTracker({
			store,
			logger,
			now: () => new Date('2026-01-02T00:00:00.000Z'),
			onStatusChange,
			snsVerifier: { verify: async () => true, isSnsUrl: () => true }
		});

		const response = await tracker.handleSnsNotification(
			snsNotification({
				eventType: 'Delivery',
				mail: sesMail,
				delivery: {
					timestamp: '2026-01-02T00:00:00.000Z',
					recipients: ['someone@example.com']
				}
			})
		);

		expect(response.status).toBe(200);
		expect(sends[0].status).toBe(EmailSendStatus.DELIVERED);
		expect(events).toHaveLength(1);
		expect(events[0].eventType).toBe('Delivery');
		expect(onStatusChange).toHaveBeenCalledWith(
			expect.objectContaining({
				emailSendInfo: expect.objectContaining({ status: EmailSendStatus.DELIVERED })
			})
		);
	});

	it('stores a late Delivery event without downgrading a bounce', async () => {
		const { store, sends, events } = createMemoryStore([
			sentRow({ status: EmailSendStatus.BOUNCED })
		]);
		const tracker = createEmailTracker({
			store,
			logger,
			snsVerifier: { verify: async () => true, isSnsUrl: () => true }
		});

		const response = await tracker.handleSnsNotification(
			snsNotification({
				eventType: 'Delivery',
				mail: sesMail,
				delivery: {
					timestamp: '2026-01-02T00:00:00.000Z',
					recipients: ['someone@example.com']
				}
			})
		);

		expect(response.status).toBe(200);
		expect(sends[0].status).toBe(EmailSendStatus.BOUNCED);
		expect(events).toHaveLength(1);
	});

	it('acknowledges unknown message ids without writing', async () => {
		const { store, events } = createMemoryStore();
		const tracker = createEmailTracker({
			store,
			logger,
			snsVerifier: { verify: async () => true, isSnsUrl: () => true }
		});

		const response = await tracker.handleSnsNotification(
			snsNotification({
				eventType: 'Bounce',
				mail: sesMail,
				bounce: { bouncedRecipients: [] }
			})
		);

		expect(response.status).toBe(200);
		expect(events).toHaveLength(0);
	});

	it('confirms a valid subscription and rejects a non-SNS SubscribeURL', async () => {
		const { store } = createMemoryStore();
		const fetchImpl = vi.fn(async () => new Response(null, { status: 200 }));
		const tracker = createEmailTracker({
			store,
			logger,
			fetch: fetchImpl,
			confirmSubscriptions: true,
			snsVerifier: {
				verify: async () => true,
				isSnsUrl: (value) => value.includes('amazonaws.com')
			}
		});

		const response = await tracker.handleSnsNotification(
			new Request('http://localhost/api/email/events', {
				method: 'POST',
				body: JSON.stringify({
					Type: 'SubscriptionConfirmation',
					SubscribeURL:
						'https://sns.eu-north-1.amazonaws.com/?Action=ConfirmSubscription',
					Token: 'token'
				})
			})
		);

		expect(response.status).toBe(200);
		expect(fetchImpl).toHaveBeenCalledOnce();

		const rejected = await tracker.handleSnsNotification(
			new Request('http://localhost/api/email/events', {
				method: 'POST',
				body: JSON.stringify({
					Type: 'SubscriptionConfirmation',
					SubscribeURL: 'https://evil.example.com/confirm',
					Token: 'token'
				})
			})
		);
		expect(rejected.status).toBe(400);
	});
});
