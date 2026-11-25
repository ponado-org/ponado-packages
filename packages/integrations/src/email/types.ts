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
	 * Headers added to every message; per-send `customHeaders` overrides them.
	 * Defaults to none. Lithuanian apps typically pass
	 * `{ 'Content-Language': 'lt' }`.
	 */
	defaultHeaders?: Record<string, string>;
	/**
	 * SES configuration set applied to every message (per-send
	 * `configurationSetName` overrides it). Required for SES event
	 * destinations (delivery notifications) to publish events.
	 */
	configurationSetName?: string;
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
	/** Extra headers; merged over `defaultHeaders`. */
	customHeaders?: Record<string, string>;
	/** Per-send SES configuration set override. */
	configurationSetName?: string;
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
