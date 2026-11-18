import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import nodemailer from 'nodemailer';
import type { Options } from 'nodemailer/lib/mailer';
import type { Transporter } from 'nodemailer';

/**
 * Amazon SES email client (server-only).
 *
 * Generic on purpose: credentials, sender identity, region and logger are all
 * injected by the consuming app — this module never reads env vars itself.
 * The app creates one instance in its coupling surface:
 *
 * ```ts
 * // src/lib/ponado-app/clients.server.ts
 * import { createEmailClient } from '@ponado/email-client';
 * import { logger } from '#lib/server/clients/index.js';
 * import { SES_ACCESS_KEY, SES_SECRET_ACCESS_KEY } from '$app/env/private';
 *
 * export const emailClient = createEmailClient({
 * 	accessKeyId: SES_ACCESS_KEY,
 * 	secretAccessKey: SES_SECRET_ACCESS_KEY,
 * 	from: { address: 'noreply@example.com', name: 'My App' },
 * 	dryRun: dev,
 * 	logger
 * });
 * ```
 */

/** Minimal structural logger — pino, console and friends all satisfy it. */
export interface EmailLogger {
	info(obj: unknown, msg?: string): void;
	warn(obj: unknown, msg?: string): void;
	error(obj: unknown, msg?: string): void;
}

/** Simple address shape accepted by nodemailer (string or `{ address, name }`). */
export type EmailAddress = string | { address: string; name?: string };

export type EmailClientOptions<TMeta = undefined> = {
	accessKeyId: string;
	secretAccessKey: string;
	/** Default sender identity; per-send `from` overrides it. */
	from: EmailAddress;
	/** Default Reply-To; per-send `replyTo` overrides it. */
	replyTo?: EmailAddress;
	/** AWS region (default `eu-north-1`). */
	region?: string;
	/** Log instead of sending — useful outside production (default `false`). */
	dryRun?: boolean;
	/** Optional logger; defaults to `console`. */
	logger?: EmailLogger;
	/**
	 * Called (and awaited) after every attempted send, success or failure.
	 * Not called for validation failures or in dry-run mode. Handler errors
	 * are logged and isolated — they never change the send result.
	 */
	onSent?: (event: EmailSentEvent<TMeta>) => void | Promise<void>;
};

export type SendEmailProps<TMeta = undefined> = {
	to: EmailAddress | EmailAddress[];
	replyTo?: EmailAddress | EmailAddress[];
	subject: string;
	html: string;
	/** Nodemailer-compatible attachment objects — passed through as-is. */
	attachments?: unknown[];
	/** Extra headers; merged over the `Content-Language: lt` default. */
	customHeaders?: Record<string, string>;
	/** Per-send sender override. */
	from?: EmailAddress;
	/** Opaque app data handed back to `onSent` — never sent to SES. */
	meta?: TMeta;
};

export type SendEmailResult = {
	success: boolean;
	messageId?: string;
	/** Raw transport error (when `success` is false). */
	error?: unknown;
	/** Human-readable error text (when `success` is false). */
	errorMessage?: string;
};

export type EmailSentEvent<TMeta = undefined> = {
	props: SendEmailProps<TMeta>;
	result: SendEmailResult;
};

export class EmailClient<TMeta = undefined> {
	#defaultFrom: Options['from'];
	#defaultReplyTo: Options['replyTo'];
	#transporter: Transporter;
	#dryRun: boolean;
	#logger: EmailLogger;
	#onSent?: (event: EmailSentEvent<TMeta>) => void | Promise<void>;

	constructor(options: EmailClientOptions<TMeta>) {
		this.#defaultFrom = options.from as Options['from'];
		this.#defaultReplyTo = options.replyTo as Options['replyTo'];
		this.#dryRun = options.dryRun ?? false;
		this.#logger = options.logger ?? console;
		this.#onSent = options.onSent;

		const sesClient = new SESv2Client({
			region: options.region ?? 'eu-north-1',
			credentials: {
				accessKeyId: options.accessKeyId,
				secretAccessKey: options.secretAccessKey
			}
		});

		this.#transporter = nodemailer.createTransport({
			// nodemailer's SES transport is not part of its public type surface
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			SES: { sesClient, SendEmailCommand } as any
		});
	}

	async #notifySent(props: SendEmailProps<TMeta>, result: SendEmailResult) {
		if (!this.#onSent) return;
		try {
			await this.#onSent({ props, result });
		} catch (err) {
			this.#logger.error(err, 'onSent handler failed');
		}
	}

	sendEmail = async (props: SendEmailProps<TMeta>): Promise<SendEmailResult> => {
		// Never send real emails in dry-run mode — just log what would be sent
		if (this.#dryRun) {
			this.#logger.info(
				{ to: props.to, subject: props.subject },
				'Skipped email sending (dry run)'
			);
			return {
				success: false,
				error: 'Skipped (dry run)',
				errorMessage: 'Skipped (dry run)'
			};
		}

		// Basic input validation
		if (!props.to || !props.subject || !props.html) {
			return {
				success: false,
				error: 'Missing required parameters',
				errorMessage: 'Missing required parameters'
			};
		}

		const headers = {
			'Content-Language': 'lt', // for Gmail language detection
			...props.customHeaders
		};

		let result: SendEmailResult;
		try {
			const info = await this.#transporter.sendMail({
				from: (props.from ?? this.#defaultFrom) as Options['from'],
				to: props.to as Options['to'],
				replyTo: (props.replyTo ?? this.#defaultReplyTo) as Options['replyTo'],
				subject: props.subject,
				html: props.html,
				headers,
				attachments: props.attachments as Options['attachments']
			});

			this.#logger.info(
				{
					envelope: info.envelope,
					messageId: info.messageId
				},
				'Email sent:'
			);

			result = { success: true, messageId: info.messageId };
		} catch (err: unknown) {
			this.#logger.error(err, 'Send email failed');
			result = {
				success: false,
				error: err,
				errorMessage: err instanceof Error ? err.message : String(err)
			};
		}

		await this.#notifySent(props, result);
		return result;
	};
}

/** Creates a client with `options` applied. */
export function createEmailClient<TMeta = undefined>(
	options: EmailClientOptions<TMeta>
): EmailClient<TMeta> {
	return new EmailClient(options);
}
