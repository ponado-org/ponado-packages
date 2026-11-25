import type { EmailLogger, EmailSentEvent } from '../types.js';
import {
	getSesEventDate,
	normalizeEmailRecipient,
	normalizeSesMessageId,
	parseSesEvent,
	resolveSesStatusUpdate
} from './ses.js';
import { SnsEnvelopeSchema } from './schemas.js';
import { createSnsVerifier, type SnsVerifier } from './sns.js';
import { EmailSendStatus, shouldApplyStatus, type EmailStatusCounts } from './status.js';
import type {
	EmailEntityRef,
	EmailEventRecord,
	EmailScopeRef,
	EmailScopeSendInfo,
	EmailSendInfo,
	EmailSendInfoEventData,
	EmailSendLookup,
	EmailStatusEvent,
	EmailStatusPatch,
	EmailTrackingMeta,
	EmailTrackingStore
} from './types.js';

export type EmailTrackerOptions = {
	store: EmailTrackingStore;
	/** pino/console-compatible logger; defaults to `console`. */
	logger?: EmailLogger;
	/** Injectable clock for tests. */
	now?: () => Date;
	/** Injectable fetch used for SNS subscription confirmation. */
	fetch?: typeof fetch;
	/** Auto-confirm SNS subscriptions (default `true`). */
	confirmSubscriptions?: boolean;
	/** Persist the raw SES event payload (default `true`). */
	storeEventPayload?: boolean;
	/** Called after every send attempt and every applied provider event. */
	onStatusChange?: (event: EmailStatusEvent) => void | Promise<void>;
	/** Test seam — the production verifier is secure by default. */
	snsVerifier?: SnsVerifier;
};

export type EmailTracker = {
	/** `onSent` handler for `createEmailClient()`. */
	recordAttempt(event: EmailSentEvent<EmailTrackingMeta>): Promise<void>;
	/** SNS webhook handler; return the response from a `+server.ts` POST. */
	handleSnsNotification(request: Request): Promise<Response>;
	findByMessageId(messageId: string): Promise<EmailSendLookup | null>;
	latestForEntity(ref: EmailEntityRef): Promise<EmailSendInfo | null>;
	latestForScope(ref: EmailScopeRef): Promise<EmailScopeSendInfo[]>;
	countsForScope(ref: EmailScopeRef): Promise<EmailStatusCounts>;
	eventsForSend(emailSendId: number): Promise<EmailEventRecord[]>;
	store: EmailTrackingStore;
};

const iso = (date: Date | null | undefined): string | null => (date ? date.toISOString() : null);

const isTrackingMeta = (meta: EmailTrackingMeta | undefined): meta is EmailTrackingMeta =>
	!!meta &&
	typeof meta.entityType === 'string' &&
	meta.entityType.length > 0 &&
	typeof meta.entityId === 'string' &&
	meta.entityId.length > 0;

const toEventData = (info: EmailSendInfo): EmailSendInfoEventData => ({
	status: info.status,
	sentAt: iso(info.sentAt),
	deliveredAt: iso(info.deliveredAt),
	bouncedAt: iso(info.bouncedAt),
	complainedAt: iso(info.complainedAt),
	errorMessage: info.errorMessage
});

/**
 * Tracks outbound sends and SES/SNS delivery events against an injected store.
 *
 * ```ts
 * const tracking = createEmailTracker({
 * 	store,
 * 	logger,
 * 	onStatusChange: (event) => appBus.emit('email-status', event)
 * });
 *
 * const email = createEmailClient({ ..., onSent: tracking.recordAttempt });
 * ```
 */
export function createEmailTracker(options: EmailTrackerOptions): EmailTracker {
	const { store } = options;
	const logger = options.logger ?? console;
	const now = options.now ?? (() => new Date());
	const fetchImpl = options.fetch ?? globalThis.fetch;
	const verifier = options.snsVerifier ?? createSnsVerifier({ fetch: fetchImpl });
	const confirmSubscriptions = options.confirmSubscriptions ?? true;
	const storeEventPayload = options.storeEventPayload ?? true;

	const emitStatus = async (event: EmailStatusEvent): Promise<void> => {
		if (!options.onStatusChange) return;
		try {
			await options.onStatusChange(event);
		} catch (err) {
			logger.error(err, 'email status handler failed');
		}
	};

	const recordAttempt = async ({
		props,
		result
	}: EmailSentEvent<EmailTrackingMeta>): Promise<void> => {
		const meta = props.meta;
		if (!isTrackingMeta(meta)) {
			logger.warn({ to: props.to }, 'email sent without tracking meta');
			return;
		}

		const at = now();
		const status = result.success ? EmailSendStatus.SENT : EmailSendStatus.FAILED;
		const errorMessage = result.success ? null : (result.errorMessage ?? null);
		const messageId = result.success ? (normalizeSesMessageId(result.messageId) ?? null) : null;

		await store.insertSend({
			entityType: meta.entityType,
			entityId: meta.entityId,
			scopeType: meta.scopeType ?? null,
			scopeId: meta.scopeId ?? null,
			toEmail: normalizeEmailRecipient(props.to),
			subject: props.subject,
			status,
			messageId,
			errorMessage,
			attemptCount: 1,
			sentAt: result.success ? at : null,
			createdBy: meta.createdBy ?? null,
			metadata: meta.metadata ?? null,
			createdAt: at,
			updatedAt: at
		});

		await emitStatus({
			entityType: meta.entityType,
			entityId: meta.entityId,
			scopeType: meta.scopeType ?? null,
			scopeId: meta.scopeId ?? null,
			emailSendInfo: toEventData({
				status,
				sentAt: result.success ? at : null,
				deliveredAt: null,
				bouncedAt: null,
				complainedAt: null,
				errorMessage
			})
		});
	};

	const processNotification = async (request: Request): Promise<Response> => {
		let payload: unknown;
		try {
			payload = await request.json();
		} catch {
			return Response.json({ error: 'Invalid JSON' }, { status: 400 });
		}

		const parsedEnvelope = SnsEnvelopeSchema.safeParse(payload);
		if (!parsedEnvelope.success) {
			return Response.json({ error: 'Invalid SNS notification' }, { status: 400 });
		}

		const notification = parsedEnvelope.data;

		if (notification.Type === 'SubscriptionConfirmation') {
			if (!(await verifier.verify(notification))) {
				logger.warn('rejected SNS subscription with invalid signature');
				return Response.json({ error: 'Invalid signature' }, { status: 401 });
			}
			if (!verifier.isSnsUrl(notification.SubscribeURL)) {
				logger.warn({ url: notification.SubscribeURL }, 'rejected non-SNS SubscribeURL');
				return Response.json({ error: 'Invalid SubscribeURL' }, { status: 400 });
			}

			if (confirmSubscriptions) {
				try {
					const response = await fetchImpl(notification.SubscribeURL);
					if (!response.ok) {
						logger.error(
							{ status: response.status },
							'SNS subscription confirmation failed'
						);
						return Response.json(
							{ error: 'Subscription confirmation failed' },
							{ status: 500 }
						);
					}
					logger.info({ status: response.status }, 'SNS subscription confirmed');
				} catch (err) {
					logger.error(err, 'SNS subscription confirmation failed');
					return Response.json(
						{ error: 'Subscription confirmation failed' },
						{ status: 500 }
					);
				}
			}

			return Response.json({ ok: true });
		}

		if (notification.Type === 'UnsubscribeConfirmation') {
			// SNS unsubscribes are acknowledged; re-subscribing is an app decision.
			return Response.json({ ok: true });
		}

		if (!(await verifier.verify(notification))) {
			logger.warn('rejected SNS notification with invalid signature');
			return Response.json({ error: 'Invalid signature' }, { status: 401 });
		}

		const event = parseSesEvent(notification.Message);
		if (!event) return Response.json({ ok: true });

		const messageId = normalizeSesMessageId(event.mail.messageId);
		if (!messageId) return Response.json({ ok: true });

		const send = await store.findByMessageId(messageId);
		if (!send) {
			logger.warn(
				{ messageId, eventType: event.eventType },
				'SES event for unknown email send'
			);
			return Response.json({ ok: true });
		}

		const update = resolveSesStatusUpdate(event);
		let patch: EmailStatusPatch | null = null;

		if (update && shouldApplyStatus(send.status, update.status)) {
			patch = { status: update.status, updatedAt: now() };
			if (update.status === EmailSendStatus.SENT && !send.sentAt) patch.sentAt = update.at;
			if (update.status === EmailSendStatus.DELIVERED) patch.deliveredAt = update.at;
			if (update.status === EmailSendStatus.BOUNCED) patch.bouncedAt = update.at;
			if (update.status === EmailSendStatus.COMPLAINED) patch.complainedAt = update.at;
			await store.updateStatus(send.id, patch);
		}

		await store.insertEvent({
			emailSendId: send.id,
			messageId,
			eventType: event.eventType,
			eventPayload: storeEventPayload ? event : null,
			occurredAt: getSesEventDate(event)
		});

		if (patch) {
			await emitStatus({
				entityType: send.entityType,
				entityId: send.entityId,
				scopeType: send.scopeType,
				scopeId: send.scopeId,
				emailSendInfo: {
					status: patch.status,
					sentAt: iso(patch.sentAt ?? send.sentAt),
					deliveredAt: iso(patch.deliveredAt ?? send.deliveredAt),
					bouncedAt: iso(patch.bouncedAt ?? send.bouncedAt),
					complainedAt: iso(patch.complainedAt ?? send.complainedAt),
					errorMessage: send.errorMessage
				}
			});
		}

		return Response.json({ ok: true });
	};

	const handleSnsNotification = async (request: Request): Promise<Response> => {
		try {
			return await processNotification(request);
		} catch (err) {
			logger.error(err, 'email webhook failed');
			return Response.json({ error: 'Internal error' }, { status: 500 });
		}
	};

	return {
		recordAttempt,
		handleSnsNotification,
		findByMessageId: (messageId) => store.findByMessageId(messageId),
		latestForEntity: (ref) => store.latestForEntity(ref),
		latestForScope: (ref) => store.latestForScope(ref),
		countsForScope: (ref) => store.countsForScope(ref),
		eventsForSend: (emailSendId) => store.eventsForSend(emailSendId),
		store
	};
}
