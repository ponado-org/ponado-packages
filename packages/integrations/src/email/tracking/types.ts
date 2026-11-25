import type { EmailSendStatus, EmailStatusCounts, SesEventType } from './status.js';

/**
 * What a tracked email is about.
 *
 * `entity` is the record the email belongs to (a recipient row, an invoice…).
 * `scope` is the optional batch/group used for filtering and counts (a packet,
 * a mailing…). Both ids are strings so a project can keep its own id type.
 */
export type EmailTrackingRef = {
	entityType: string;
	entityId: string;
	scopeType?: string | null;
	scopeId?: string | null;
};

/** `meta` handed to `sendEmail()` and returned to the send tracker. */
export type EmailTrackingMeta = EmailTrackingRef & {
	createdBy?: string | null;
	metadata?: Record<string, unknown> | null;
};

export type EmailSendInfo = {
	status: EmailSendStatus;
	sentAt: Date | null;
	deliveredAt: Date | null;
	bouncedAt: Date | null;
	complainedAt: Date | null;
	errorMessage: string | null;
};

/** Serializable form broadcast over SSE (dates are ISO strings). */
export type EmailSendInfoEventData = {
	status: EmailSendStatus;
	sentAt: string | null;
	deliveredAt: string | null;
	bouncedAt: string | null;
	complainedAt: string | null;
	errorMessage: string | null;
};

export type EmailStatusEvent = {
	entityType: string;
	entityId: string;
	scopeType: string | null;
	scopeId: string | null;
	emailSendInfo: EmailSendInfoEventData;
};

/** Event map shared between the tracker and SSE clients. */
export type EmailEventMap = {
	'email-status': EmailStatusEvent;
};

/** The minimum a provider event needs from the stored send. */
export type EmailSendLookup = {
	id: number;
	entityType: string;
	entityId: string;
	scopeType: string | null;
	scopeId: string | null;
	status: EmailSendStatus;
	sentAt: Date | null;
	deliveredAt: Date | null;
	bouncedAt: Date | null;
	complainedAt: Date | null;
	errorMessage: string | null;
};

export type NewEmailSend = {
	entityType: string;
	entityId: string;
	scopeType: string | null;
	scopeId: string | null;
	toEmail: string;
	subject: string;
	status: EmailSendStatus;
	messageId: string | null;
	errorMessage: string | null;
	attemptCount: number;
	sentAt: Date | null;
	createdBy: string | null;
	metadata: Record<string, unknown> | null;
	createdAt: Date;
	updatedAt: Date;
};

export type EmailStatusPatch = {
	status: EmailSendStatus;
	sentAt?: Date;
	deliveredAt?: Date;
	bouncedAt?: Date;
	complainedAt?: Date;
	updatedAt: Date;
};

export type NewEmailEvent = {
	emailSendId: number;
	messageId: string;
	eventType: SesEventType;
	eventPayload: unknown;
	occurredAt: Date;
};

export type EmailEventRecord = NewEmailEvent & { id: number };

export type EmailEntityRef = {
	entityType: string;
	entityId: string;
};

export type EmailScopeRef = {
	scopeType: string;
	scopeId: string;
};

export type EmailScopeSendInfo = {
	entityId: string;
	info: EmailSendInfo;
};

/**
 * Persistence seam. The registry block ships a Drizzle implementation; any
 * project can implement this interface over its own tables instead.
 */
export type EmailTrackingStore = {
	insertSend(input: NewEmailSend): Promise<void>;
	findByMessageId(messageId: string): Promise<EmailSendLookup | null>;
	updateStatus(id: number, patch: EmailStatusPatch): Promise<void>;
	insertEvent(input: NewEmailEvent): Promise<void>;
	latestForEntity(ref: EmailEntityRef): Promise<EmailSendInfo | null>;
	latestForScope(ref: EmailScopeRef): Promise<EmailScopeSendInfo[]>;
	countsForScope(ref: EmailScopeRef): Promise<EmailStatusCounts>;
	eventsForSend(emailSendId: number): Promise<EmailEventRecord[]>;
};
