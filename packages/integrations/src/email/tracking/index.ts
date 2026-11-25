export {
	EmailSendStatus,
	SES_EVENT_TYPES,
	SES_STATUS_BY_EVENT,
	createEmptyEmailStatusCounts,
	isEmailResendable,
	isEmailSentOrInFlight,
	shouldApplyStatus
} from './status.js';
export type { EmailStatusCounts, SesEventType } from './status.js';

export {
	SnsEnvelopeSchema,
	SnsNotificationSchema,
	SnsSubscriptionConfirmationSchema,
	SnsUnsubscribeConfirmationSchema,
	SesEventSchema
} from './schemas.js';
export type { SnsCanonicalFields, SnsEnvelope, SnsNotification, SesEvent } from './schemas.js';

export {
	getSesEventDate,
	normalizeEmailRecipient,
	normalizeSesMessageId,
	parseSesEvent,
	resolveSesStatusUpdate
} from './ses.js';
export type { SesStatusUpdate } from './ses.js';

export { createSnsVerifier, snsCanonicalString } from './sns.js';
export type { SnsVerifier, SnsVerifierOptions } from './sns.js';

export { createEmailTracker } from './tracker.js';
export type { EmailTracker, EmailTrackerOptions } from './tracker.js';

export type {
	EmailEntityRef,
	EmailEventMap,
	EmailEventRecord,
	EmailScopeRef,
	EmailScopeSendInfo,
	EmailSendInfo,
	EmailSendInfoEventData,
	EmailSendLookup,
	EmailStatusEvent,
	EmailStatusPatch,
	EmailTrackingMeta,
	EmailTrackingRef,
	EmailTrackingStore,
	NewEmailEvent,
	NewEmailSend
} from './types.js';
