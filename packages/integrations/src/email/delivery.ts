import type { EmailAddress, EmailLogger, SendEmailProps, SendEmailResult } from './types.js';

/**
 * Outbound delivery policy.
 *
 * `live`      — send to the real recipients.
 * `allowlist` — send only when every recipient is listed in `recipients`.
 * `redirect`  — send every email to `recipients` instead.
 * `off`       — never call the provider.
 *
 * The policy is injected by the app; this module never reads environment
 * variables or deployment modes.
 */
export const EMAIL_DELIVERY_MODES = ['live', 'allowlist', 'redirect', 'off'] as const;

export type EmailDeliveryMode = (typeof EMAIL_DELIVERY_MODES)[number];

export type EmailDeliveryPolicy = {
	mode: EmailDeliveryMode;
	/** Addresses used by `allowlist` (allowed) and `redirect` (destination). */
	recipients: readonly string[];
};

/** The part of an email client the policy needs. `EmailClient` satisfies it. */
export type EmailSender<TMeta = undefined> = {
	sendEmail: (props: SendEmailProps<TMeta>) => Promise<SendEmailResult>;
};

export type EmailDeliveryOptions<TMeta = undefined> = EmailDeliveryPolicy & {
	/** Defaults to `console`. */
	logger?: EmailLogger;
	/** Subject prefix added in redirect mode; `false` keeps the subject. Default `[TEST] `. */
	subjectPrefix?: string | false;
	/**
	 * Maps the redirected send before it leaves. Use it to record the intended
	 * recipients in your own tracking meta.
	 */
	onRedirect?: (
		props: SendEmailProps<TMeta>,
		originalRecipients: string[]
	) => SendEmailProps<TMeta>;
};

const DEFAULT_SUBJECT_PREFIX = '[TEST] ';

function recipientAddresses(to: EmailAddress | EmailAddress[] | undefined): string[] {
	if (!to) return [];

	const list = Array.isArray(to) ? to : [to];
	return list
		.map((recipient) => (typeof recipient === 'string' ? recipient : recipient.address))
		.map((address) => address.trim().toLowerCase())
		.filter(Boolean);
}

function normalizeRecipients(recipients: readonly string[]): string[] {
	const addresses = recipients.map((address) => address.trim().toLowerCase()).filter(Boolean);

	return [...new Set(addresses)];
}

function skipped(reason: string): SendEmailResult {
	return { success: false, error: reason, errorMessage: reason };
}

/**
 * Wraps an email client with a delivery policy.
 *
 * Skipped sends never reach the provider and therefore never trigger the
 * client's `onSent` hook. In `redirect` mode the original recipients are
 * handed to `onRedirect` before the send leaves, so the app can keep them in
 * tracking metadata.
 */
export function withEmailDeliveryPolicy<TMeta = undefined>(
	client: EmailSender<TMeta>,
	options: EmailDeliveryOptions<TMeta>
): EmailSender<TMeta> {
	const logger = options.logger ?? console;
	const recipients = normalizeRecipients(options.recipients);
	const subjectPrefix =
		options.subjectPrefix === undefined ? DEFAULT_SUBJECT_PREFIX : options.subjectPrefix;

	return {
		sendEmail: async (props) => {
			const originalTo = recipientAddresses(props.to);

			if (options.mode === 'off') {
				logger.warn(
					{ to: originalTo, subject: props.subject },
					'Email delivery is off; send skipped'
				);
				return skipped('Email delivery is off');
			}

			if (options.mode === 'allowlist') {
				if (recipients.length === 0) {
					logger.warn(
						{ subject: props.subject },
						'Email allowlist has no recipients; send skipped'
					);
					return skipped('Email allowlist has no recipients');
				}

				const allowed = new Set(recipients);
				const blocked = originalTo.filter((address) => !allowed.has(address));

				if (blocked.length > 0) {
					logger.warn(
						{ blocked, subject: props.subject },
						'Email recipients are not allowlisted; send skipped'
					);
					return skipped('Recipients are not allowlisted');
				}
			}

			if (options.mode === 'redirect') {
				if (recipients.length === 0) {
					logger.warn(
						{ subject: props.subject },
						'Email redirect has no recipients; send skipped'
					);
					return skipped('Email redirect has no recipients');
				}

				logger.info(
					{ originalTo, redirectedTo: recipients, subject: props.subject },
					'Email redirected to test recipients'
				);

				const subject =
					subjectPrefix === false || props.subject.startsWith(subjectPrefix)
						? props.subject
						: `${subjectPrefix}${props.subject}`;

				const redirected: SendEmailProps<TMeta> = {
					...props,
					to: recipients,
					subject
				};

				return client.sendEmail(
					options.onRedirect ? options.onRedirect(redirected, originalTo) : redirected
				);
			}

			return client.sendEmail(props);
		}
	};
}
