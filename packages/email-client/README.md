# @ponado/email-client

Amazon SES email client built on nodemailer's SES transport. Framework-free,
with dry-run mode, an injected logger, and an optional `onSent` hook.

## Usage

```ts
import { createEmailClient } from '@ponado/email-client';

export const emailClient = createEmailClient({
	accessKeyId: SES_ACCESS_KEY,
	secretAccessKey: SES_SECRET_ACCESS_KEY,
	from: { address: 'noreply@example.com', name: 'My App' },
	region: 'eu-north-1', // default
	dryRun: false, // log instead of sending
	logger, // optional; defaults to console
	onSent: async ({ props, result }) => {
		// record the attempt — props.meta carries per-send app data
		await recordEmailAttempt({ meta: props.meta, result });
	}
});

await emailClient.sendEmail({
	to: 'someone@example.com',
	subject: 'Hello',
	html: '<p>Hello</p>',
	meta: { packetId: 42 } // opaque; handed back to onSent
});
```

`sendEmail` never throws — it returns `{ success, messageId?, error?, errorMessage? }`.

- Missing `to`/`subject`/`html` and dry-run mode return `success: false` without
  touching SES and without calling `onSent`.
- `onSent` is awaited after every attempted send (success or failure); handler
  errors are logged and isolated.
- `meta` is opaque app data — it is never sent to SES.
- Attachments and nodemailer `Options` fields are passed through.
