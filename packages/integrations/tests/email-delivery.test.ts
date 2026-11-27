import { describe, expect, it } from 'vitest';
import {
	withEmailDeliveryPolicy,
	type EmailDeliveryOptions,
	type EmailLogger,
	type EmailSender,
	type SendEmailProps,
	type SendEmailResult
} from '../src/email/index.js';

type Meta = {
	notification?: string;
	originalTo?: string[];
};

function baseProps(overrides: Partial<SendEmailProps<Meta>> = {}): SendEmailProps<Meta> {
	return {
		to: 'person@example.test',
		subject: 'Sveikinimas',
		html: '<p>Sveikinimas</p>',
		...overrides
	};
}

function fakeClient() {
	const calls: SendEmailProps<Meta>[] = [];
	const client: EmailSender<Meta> = {
		sendEmail: async (props): Promise<SendEmailResult> => {
			calls.push(props);
			return { success: true, messageId: 'fake-message' };
		}
	};
	return { client, calls };
}

function fakeLogger() {
	const info: { obj: unknown; message?: string }[] = [];
	const warn: { obj: unknown; message?: string }[] = [];
	const logger: EmailLogger = {
		info: (obj, message) => info.push({ obj, message }),
		warn: (obj, message) => warn.push({ obj, message }),
		error: () => {}
	};
	return { logger, info, warn };
}

async function send(
	options: EmailDeliveryOptions<Meta>,
	props = baseProps()
): Promise<{ result: SendEmailResult; calls: SendEmailProps<Meta>[]; warn: { obj: unknown }[] }> {
	const { client, calls } = fakeClient();
	const { logger, warn } = fakeLogger();
	const email = withEmailDeliveryPolicy(client, { ...options, logger });

	return { result: await email.sendEmail(props), calls, warn };
}

describe('withEmailDeliveryPolicy', () => {
	it('never calls the provider in off mode', async () => {
		const { result, calls, warn } = await send({ mode: 'off' });

		expect(calls).toHaveLength(0);
		expect(result.success).toBe(false);
		expect(result.errorMessage).toBe('Email delivery is off');
		expect(warn).toHaveLength(1);
	});

	it('sends allowlisted recipients through unchanged', async () => {
		const { result, calls } = await send(
			{ mode: 'allowlist', testRecipients: ['me@example.test'] },
			baseProps({ to: { address: 'ME@Example.test', name: 'Me' } })
		);

		expect(result.success).toBe(true);
		expect(calls).toHaveLength(1);
		expect(calls[0].to).toEqual({ address: 'ME@Example.test', name: 'Me' });
	});

	it('skips the whole send when any recipient is not allowlisted', async () => {
		const { result, calls, warn } = await send(
			{ mode: 'allowlist', testRecipients: ['me@example.test'] },
			baseProps({ to: ['me@example.test', 'person@example.test'] })
		);

		expect(calls).toHaveLength(0);
		expect(result.success).toBe(false);
		expect(result.errorMessage).toBe('Recipients are not allowlisted');
		expect(warn).toHaveLength(1);
	});

	it('skips an allowlist send without recipients', async () => {
		const { result, calls } = await send({ mode: 'allowlist', testRecipients: [] });

		expect(calls).toHaveLength(0);
		expect(result.success).toBe(false);
		expect(result.errorMessage).toBe('Email allowlist has no recipients');
	});

	it('redirects every recipient and hands the originals to the hook', async () => {
		const seen: { original: string[]; to: string[] }[] = [];
		const { result, calls } = await send(
			{
				mode: 'redirect',
				testRecipients: ['me@example.test'],
				onRedirect: (props, originalRecipients) => {
					seen.push({ original: originalRecipients, to: props.to as string[] });
					return {
						...props,
						meta: { ...props.meta, originalTo: originalRecipients }
					};
				}
			},
			baseProps({
				to: ['person@example.test', 'other@example.test'],
				meta: { notification: 'person_event_certificate' }
			})
		);

		expect(result.success).toBe(true);
		expect(calls[0].to).toEqual(['me@example.test']);
		expect(calls[0].subject).toBe('[TEST] Sveikinimas');
		expect(calls[0].meta).toEqual({
			notification: 'person_event_certificate',
			originalTo: ['person@example.test', 'other@example.test']
		});
		expect(seen).toEqual([
			{
				original: ['person@example.test', 'other@example.test'],
				to: ['me@example.test']
			}
		]);
	});

	it('does not double-prefix the subject and supports disabling the prefix', async () => {
		const prefixed = await send(
			{ mode: 'redirect', testRecipients: ['me@example.test'] },
			baseProps({ subject: '[TEST] Sveikinimas' })
		);
		expect(prefixed.calls[0].subject).toBe('[TEST] Sveikinimas');

		const bare = await send(
			{ mode: 'redirect', testRecipients: ['me@example.test'], subjectPrefix: false },
			baseProps()
		);
		expect(bare.calls[0].subject).toBe('Sveikinimas');
	});

	it('skips a redirect without recipients', async () => {
		const { result, calls } = await send({ mode: 'redirect', testRecipients: [] });

		expect(calls).toHaveLength(0);
		expect(result.success).toBe(false);
		expect(result.errorMessage).toBe('Email redirect has no recipients');
	});

	it('passes direct sends straight through', async () => {
		const props = baseProps({ to: 'person@example.test' });
		const { result, calls } = await send({ mode: 'direct' }, props);

		expect(result.success).toBe(true);
		expect(calls[0]).toEqual(props);
	});
});
