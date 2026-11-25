import type { Options } from 'nodemailer/lib/mailer';
import type { Transporter } from 'nodemailer';
import type {
	EmailClientOptions,
	EmailLogger,
	EmailSentEvent,
	SendEmailProps,
	SendEmailResult
} from './types.js';

/**
 * Amazon SES email client (server-only).
 *
 * Generic on purpose: credentials, sender identity, region and logger are all
 * injected by the consuming app — this module never reads env vars itself.
 * The app creates one instance in its coupling surface:
 *
 * ```ts
 * // src/lib/ponado-app/clients.server.ts
 * import { createEmailClient } from '@ponado-org/integrations/email';
 * import { logger } from '#lib/server/clients/index.js';
 * import { SES_ACCESS_KEY, SES_SECRET_ACCESS_KEY } from '$app/env/private';
 *
 * export const emailClient = createEmailClient({
 * 	accessKeyId: SES_ACCESS_KEY,
 * 	secretAccessKey: SES_SECRET_ACCESS_KEY,
 * 	from: { address: 'noreply@example.com', name: 'My App' },
 * 	defaultHeaders: { 'Content-Language': 'lt' },
 * 	dryRun: dev,
 * 	logger
 * });
 * ```
 */
export class EmailClient<TMeta = undefined> {
	#defaultFrom: Options['from'];
	#defaultReplyTo: Options['replyTo'];
	#defaultHeaders: Record<string, string>;
	#configurationSetName: string | undefined;
	#accessKeyId: string;
	#secretAccessKey: string;
	#region: string;
	#transporterPromise?: Promise<Transporter>;
	#dryRun: boolean;
	#logger: EmailLogger;
	#onSent?: (event: EmailSentEvent<TMeta>) => void | Promise<void>;

	constructor(options: EmailClientOptions<TMeta>) {
		this.#defaultFrom = options.from as Options['from'];
		this.#defaultReplyTo = options.replyTo as Options['replyTo'];
		this.#defaultHeaders = options.defaultHeaders ?? {};
		this.#configurationSetName = options.configurationSetName;
		this.#accessKeyId = options.accessKeyId;
		this.#secretAccessKey = options.secretAccessKey;
		this.#region = options.region ?? 'eu-north-1';
		this.#dryRun = options.dryRun ?? false;
		this.#logger = options.logger ?? console;
		this.#onSent = options.onSent;
	}

	/**
	 * Loads the SES transport on first send.
	 *
	 * Tracking-only consumers import this module without installing
	 * `@aws-sdk/client-sesv2`/`nodemailer`; only calling `sendEmail()` requires
	 * them. A failed import is reported through the normal `SendEmailResult`.
	 */
	async #getTransporter(): Promise<Transporter> {
		this.#transporterPromise ??= (async () => {
			const [{ SESv2Client, SendEmailCommand }, nodemailer] = await Promise.all([
				import('@aws-sdk/client-sesv2'),
				import('nodemailer')
			]);

			const sesClient = new SESv2Client({
				region: this.#region,
				credentials: {
					accessKeyId: this.#accessKeyId,
					secretAccessKey: this.#secretAccessKey
				}
			});

			return nodemailer.default.createTransport({
				// nodemailer's SES transport is not part of its public type surface
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				SES: { sesClient, SendEmailCommand } as any
			});
		})();

		return this.#transporterPromise;
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
			...this.#defaultHeaders,
			...props.customHeaders
		};

		const configurationSetName = props.configurationSetName ?? this.#configurationSetName;

		let result: SendEmailResult;
		try {
			const transporter = await this.#getTransporter();
			const info = await transporter.sendMail({
				from: (props.from ?? this.#defaultFrom) as Options['from'],
				to: props.to as Options['to'],
				replyTo: (props.replyTo ?? this.#defaultReplyTo) as Options['replyTo'],
				subject: props.subject,
				html: props.html,
				headers,
				attachments: props.attachments as Options['attachments'],
				// Merged into the SendEmailCommand input by nodemailer's SES
				// transport; a configuration set is what makes SES publish
				// delivery events to SNS.
				ses: configurationSetName
					? { ConfigurationSetName: configurationSetName }
					: undefined
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
