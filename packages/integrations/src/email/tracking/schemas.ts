import { z } from 'zod';

// ─── SNS notification envelope ─────────────────────────────────────────────
// https://docs.aws.amazon.com/sns/latest/dg/sns-message-and-json-formats.html

const SnsCommonSchema = z.object({
	MessageId: z.string().optional(),
	Subject: z.string().optional(),
	TopicArn: z.string().optional(),
	Signature: z.string().optional(),
	SignatureVersion: z.string().optional(),
	SigningCertURL: z.string().optional(),
	UnsubscribeURL: z.string().optional(),
	Timestamp: z.string().optional()
});

export const SnsSubscriptionConfirmationSchema = SnsCommonSchema.extend({
	Type: z.literal('SubscriptionConfirmation'),
	Message: z.string().optional(),
	SubscribeURL: z.string(),
	Token: z.string()
});

export const SnsUnsubscribeConfirmationSchema = SnsCommonSchema.extend({
	Type: z.literal('UnsubscribeConfirmation'),
	Message: z.string().optional(),
	SubscribeURL: z.string().optional(),
	Token: z.string().optional()
});

export const SnsNotificationSchema = SnsCommonSchema.extend({
	Type: z.literal('Notification'),
	Message: z.string()
});

export const SnsEnvelopeSchema = z.discriminatedUnion('Type', [
	SnsSubscriptionConfirmationSchema,
	SnsUnsubscribeConfirmationSchema,
	SnsNotificationSchema
]);

export type SnsEnvelope = z.infer<typeof SnsEnvelopeSchema>;
export type SnsNotification = z.infer<typeof SnsNotificationSchema>;

// Fields SNS uses to build the signed canonical string (all optional).
export type SnsCanonicalFields = {
	Message?: string;
	MessageId?: string;
	Subject?: string;
	SubscribeURL?: string;
	Timestamp?: string;
	Token?: string;
	TopicArn?: string;
	Type?: string;
	Signature?: string;
	SignatureVersion?: string;
	SigningCertURL?: string;
};

// ─── SES event payload (the Message field of an SNS Notification) ──────────
// https://docs.aws.amazon.com/ses/latest/dg/event-publishing-retrieving-sns-examples.html

const RecipientSchema = z.object({ emailAddress: z.string() });

const MailSchema = z.object({
	messageId: z.string(),
	timestamp: z.string(),
	source: z.string().optional(),
	sourceArn: z.string().optional(),
	sendingAccountId: z.string().optional(),
	destination: z.array(z.string()).optional(),
	headersTruncated: z.boolean().optional(),
	headers: z.array(z.object({ name: z.string(), value: z.string() })).optional(),
	commonHeaders: z
		.object({
			from: z.array(z.string()).optional(),
			to: z.array(z.string()).optional(),
			cc: z.array(z.string()).optional(),
			bcc: z.array(z.string()).optional(),
			subject: z.string().optional(),
			messageId: z.string().optional(),
			date: z.string().optional()
		})
		.optional()
});

const DeliverySchema = z.object({
	timestamp: z.string(),
	processingTimeMillis: z.number().optional(),
	recipients: z.array(z.string()),
	smtpResponse: z.string().optional(),
	reportingMTA: z.string().optional(),
	remoteMtaIp: z.string().optional(),
	latency: z.number().optional(),
	addressArn: z.string().optional()
});

const BounceSchema = z.object({
	bounceType: z.enum(['Undetermined', 'Permanent', 'Transient']).optional(),
	bounceSubType: z
		.enum([
			'Undetermined',
			'General',
			'NoEmail',
			'Suppressed',
			'OnAccountSuppressionList',
			'MailboxFull',
			'MessageTooLarge',
			'ContentRejected',
			'AttachmentRejected'
		])
		.optional(),
	bouncedRecipients: z.array(
		RecipientSchema.extend({
			action: z.string().optional(),
			status: z.string().optional(),
			diagnosticCode: z.string().optional()
		})
	),
	timestamp: z.string().optional(),
	feedbackId: z.string().optional(),
	reportingMTA: z.string().optional(),
	remoteMtaIp: z.string().optional()
});

const ComplaintSchema = z.object({
	complainedRecipients: z.array(RecipientSchema),
	timestamp: z.string().optional(),
	feedbackId: z.string().optional(),
	complaintFeedbackType: z
		.enum(['abuse', 'auth-failure', 'fraud', 'not-spam', 'other', 'virus'])
		.optional(),
	userAgent: z.string().optional(),
	arrivalDate: z.string().optional()
});

// Discriminated union keyed on eventType literal.
export const SesEventSchema = z.discriminatedUnion('eventType', [
	z.object({ eventType: z.literal('Send'), mail: MailSchema }),
	z.object({ eventType: z.literal('Delivery'), mail: MailSchema, delivery: DeliverySchema }),
	z.object({ eventType: z.literal('Bounce'), mail: MailSchema, bounce: BounceSchema }),
	z.object({ eventType: z.literal('Complaint'), mail: MailSchema, complaint: ComplaintSchema }),
	z.object({ eventType: z.literal('Reject'), mail: MailSchema }),
	z.object({ eventType: z.literal('Open'), mail: MailSchema }),
	z.object({ eventType: z.literal('Click'), mail: MailSchema }),
	z.object({
		eventType: z.literal('DeliveryDelay'),
		mail: MailSchema,
		deliveryDelay: z.unknown().optional()
	}),
	z.object({
		eventType: z.literal('RenderingFailure'),
		mail: MailSchema,
		failure: z.unknown().optional()
	}),
	z.object({
		eventType: z.literal('Subscription'),
		mail: MailSchema,
		subscription: z.unknown().optional()
	})
]);

export type SesEvent = z.infer<typeof SesEventSchema>;
