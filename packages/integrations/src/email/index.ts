/**
 * Email integration.
 *
 * - `createEmailClient` — Amazon SES sending through nodemailer.
 * - `withEmailDeliveryPolicy` — opt-in live/allowlist/redirect/off switch.
 * - `createEmailTracker` — outbound send tracking + SES/SNS delivery events.
 *
 * All live on the single `@ponado-org/integrations/email` subpath so the
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
export { EMAIL_DELIVERY_MODES, withEmailDeliveryPolicy } from './delivery.js';
export type {
	EmailDeliveryMode,
	EmailDeliveryOptions,
	EmailDeliveryPolicy,
	EmailSender
} from './delivery.js';
export * from './tracking/index.js';
