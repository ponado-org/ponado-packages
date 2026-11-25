/**
 * Delivery status model shared by sending, provider events and the UI.
 *
 * String values (not integers) so a status is readable in the database, in
 * SSE payloads and in other projects that don't share this enum's numbering.
 */
export enum EmailSendStatus {
	PENDING = 'pending',
	SENT = 'sent',
	DELIVERED = 'delivered',
	BOUNCED = 'bounced',
	COMPLAINED = 'complained',
	FAILED = 'failed'
}

/** How many sends are currently in each state. `notSent` is app-owned. */
export type EmailStatusCounts = Record<EmailSendStatus, number>;

/** SES event types worth persisting. Status changes are a subset (see below). */
export const SES_EVENT_TYPES = [
	'Send',
	'Delivery',
	'Bounce',
	'Complaint',
	'Reject',
	'Open',
	'Click',
	'DeliveryDelay',
	'RenderingFailure',
	'Subscription'
] as const;

export type SesEventType = (typeof SES_EVENT_TYPES)[number];

/**
 * Provider event → status. Events not listed here are stored but do not move
 * the send state (opens, clicks, delays, rendering failures, subscriptions).
 */
export const SES_STATUS_BY_EVENT: Partial<Record<SesEventType, EmailSendStatus>> = {
	Send: EmailSendStatus.SENT,
	Delivery: EmailSendStatus.DELIVERED,
	Bounce: EmailSendStatus.BOUNCED,
	Complaint: EmailSendStatus.COMPLAINED,
	Reject: EmailSendStatus.FAILED
};

/**
 * True when the item was already handed to the mail provider (or confirmed
 * delivered), so it should not be sent again.
 */
export const isEmailSentOrInFlight = (status?: EmailSendStatus | null): boolean =>
	status === EmailSendStatus.PENDING ||
	status === EmailSendStatus.SENT ||
	status === EmailSendStatus.DELIVERED;

/** True when a previous send attempt failed and the email can be retried. */
export const isEmailResendable = (status?: EmailSendStatus | null): boolean =>
	status === EmailSendStatus.BOUNCED ||
	status === EmailSendStatus.COMPLAINED ||
	status === EmailSendStatus.FAILED;

const TERMINAL_STATUSES: ReadonlySet<EmailSendStatus> = new Set([
	EmailSendStatus.BOUNCED,
	EmailSendStatus.COMPLAINED,
	EmailSendStatus.FAILED
]);

/**
 * SNS can deliver events out of order. Only move forward:
 *
 *   pending → sent → delivered → bounced/complained/failed
 *
 * A late `Delivery` after a bounce/complaint/failure never downgrades it. A
 * terminal → terminal move is allowed (a complaint can follow a bounce), but a
 * terminal → delivered/sent move is not.
 */
export function shouldApplyStatus(
	current: EmailSendStatus | null | undefined,
	next: EmailSendStatus
): boolean {
	if (!current) return true;
	if (current === next) return false;
	if (TERMINAL_STATUSES.has(current)) return TERMINAL_STATUSES.has(next);
	if (current === EmailSendStatus.DELIVERED) return TERMINAL_STATUSES.has(next);
	return true;
}

/** All statuses at zero — apps add their own `notSent` on top when needed. */
export function createEmptyEmailStatusCounts(): EmailStatusCounts {
	return {
		[EmailSendStatus.PENDING]: 0,
		[EmailSendStatus.SENT]: 0,
		[EmailSendStatus.DELIVERED]: 0,
		[EmailSendStatus.BOUNCED]: 0,
		[EmailSendStatus.COMPLAINED]: 0,
		[EmailSendStatus.FAILED]: 0
	};
}
