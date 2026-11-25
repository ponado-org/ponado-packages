import type { EmailAddress } from '../types.js';
import type { SesEvent } from './schemas.js';
import { SesEventSchema } from './schemas.js';
import { EmailSendStatus, SES_STATUS_BY_EVENT } from './status.js';

/**
 * SES returns message ids wrapped in angle brackets and with the provider
 * domain attached (`<abc123@email.amazonses.com>`). SNS events may use a
 * different provider domain than nodemailer, so match on the local part only.
 */
export function normalizeSesMessageId(messageId: string | undefined): string | undefined {
	return (messageId ?? '').replace(/[<>]/g, '').trim().toLowerCase().split('@')[0] || undefined;
}

export function normalizeEmailRecipient(to: EmailAddress | EmailAddress[] | undefined): string {
	if (!to) return '';
	if (typeof to === 'string') return to;
	if (Array.isArray(to)) {
		return to
			.map((recipient) =>
				typeof recipient === 'string'
					? recipient
					: (recipient.address ?? recipient.name ?? '')
			)
			.filter(Boolean)
			.join(', ');
	}
	return to.address ?? to.name ?? '';
}

export function parseSesEvent(message: string): SesEvent | null {
	let payload: unknown;
	try {
		payload = JSON.parse(message);
	} catch {
		return null;
	}
	const parsed = SesEventSchema.safeParse(payload);
	return parsed.success ? parsed.data : null;
}

/** The SES event timestamp that should be stored on the send/event row. */
export function getSesEventDate(event: SesEvent): Date {
	const timestamp =
		event.eventType === 'Delivery'
			? event.delivery.timestamp
			: event.eventType === 'Bounce'
				? (event.bounce.timestamp ?? event.mail.timestamp)
				: event.eventType === 'Complaint'
					? (event.complaint.timestamp ?? event.mail.timestamp)
					: event.mail.timestamp;
	return new Date(timestamp);
}

export type SesStatusUpdate = {
	status: EmailSendStatus;
	at: Date;
};

/** The status move caused by an SES event, if it moves status at all. */
export function resolveSesStatusUpdate(event: SesEvent): SesStatusUpdate | null {
	const status = SES_STATUS_BY_EVENT[event.eventType];
	if (!status) return null;
	return { status, at: getSesEventDate(event) };
}
