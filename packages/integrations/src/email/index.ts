/**
 * Email integration.
 *
 * - `createEmailClient` — Amazon SES sending through nodemailer.
 * - `createEmailTracker` — outbound send tracking + SES/SNS delivery events.
 *
 * Both live on the single `@ponado-org/integrations/email` subpath so the
 * import says exactly what it is.
 */
export type {
	EmailAddress,
	EmailClientOptions,
	EmailLogger,
	EmailSentEvent,
	SendEmailProps,
	SendEmailResult
} from './types.js';
export { EmailClient, createEmailClient } from './client.js';
export * from './tracking/index.js';
