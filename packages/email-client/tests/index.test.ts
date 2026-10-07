import { expect, test, vi } from 'vitest';
import { createEmailClient, EmailClient } from '../src';

const { sendMail } = vi.hoisted(() => ({ sendMail: vi.fn() }));

vi.mock('nodemailer', () => ({
	default: {
		createTransport: () => ({ sendMail })
	}
}));

const logger = { info: () => {}, warn: () => {}, error: () => {} };

test('dry run skips sending, returns errorMessage and does not fire onSent', async () => {
	let called = false;
	const client = createEmailClient({
		accessKeyId: 'test',
		secretAccessKey: 'test',
		from: 'test@example.com',
		dryRun: true,
		logger,
		onSent: () => {
			called = true;
		}
	});

	const result = await client.sendEmail({
		to: 'someone@example.com',
		subject: 'Hello',
		html: '<p>Hello</p>'
	});

	expect(result.success).toBe(false);
	expect(result.errorMessage).toContain('dry run');
	expect(called).toBe(false);
});

test('missing parameters are rejected without throwing', async () => {
	let called = false;
	const client = new EmailClient({
		accessKeyId: 'test',
		secretAccessKey: 'test',
		from: 'test@example.com',
		logger,
		onSent: () => {
			called = true;
		}
	});

	const result = await client.sendEmail({ to: 'someone@example.com' });

	expect(result.success).toBe(false);
	expect(result.errorMessage).toBe('Missing required parameters');
	expect(called).toBe(false);
});

test('default replyTo is forwarded and per-send replyTo overrides it', async () => {
	sendMail.mockResolvedValue({ envelope: {}, messageId: 'test' });

	const client = createEmailClient({
		accessKeyId: 'test',
		secretAccessKey: 'test',
		from: 'test@example.com',
		replyTo: 'replies@example.com',
		logger
	});

	await client.sendEmail({ to: 'someone@example.com', subject: 'Hello', html: '<p>Hello</p>' });
	expect(sendMail).toHaveBeenLastCalledWith(
		expect.objectContaining({ replyTo: 'replies@example.com' })
	);

	await client.sendEmail({
		to: 'someone@example.com',
		subject: 'Hello',
		html: '<p>Hello</p>',
		replyTo: 'override@example.com'
	});
	expect(sendMail).toHaveBeenLastCalledWith(
		expect.objectContaining({ replyTo: 'override@example.com' })
	);
});
