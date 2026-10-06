import { expect, test } from 'vitest';
import { createEmailClient, EmailClient } from '../src';

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
