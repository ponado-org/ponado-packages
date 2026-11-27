# @ponado-org/integrations

Node integrations in one package with subpath exports. The package itself
installs **nothing**. Each subpath's SDK is listed under `subpathDependencies`
and must be installed explicitly, so an app only downloads what it uses.

| Subpath            | Install alongside                                                  |
| ------------------ | ------------------------------------------------------------------ |
| `/storage`         | –                                                                  |
| `/stockx`          | –                                                                  |
| `/s3`              | `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `file-type` |
| `/email`           | `@aws-sdk/client-sesv2`, `nodemailer`, `zod`                       |
| `/google-calendar` | `@googleapis/calendar`, `google-auth-library`                      |

```bash
pnpm add @ponado-org/integrations @aws-sdk/client-s3 @aws-sdk/s3-request-presigner file-type
```

If you import a subpath whose SDK isn't installed, the import fails immediately
with a normal `ERR_MODULE_NOT_FOUND` for that SDK — nothing else is affected.

## `/s3`

AWS S3 (and S3-compatible, e.g. MinIO) wrapper with file-type detection,
signed URLs, batch deletes and bucket cloning.

```ts
import { createS3Client } from '@ponado-org/integrations/s3';

const s3 = createS3Client({
	region: 'us-east-1',
	endpoint: 'https://s3.amazonaws.com',
	defaultBucket: 'my-bucket',
	credentials: { accessKeyId: '...', secretAccessKey: '...' },
	forcePathStyle: false
});

const { key } = await s3.uploadObject({ file: buffer, fileId: 'unique-id' });
const { signedUrl } = await s3.getSignedUrl({ key });
const { objectBuffer } = await s3.getObject({ key });
const objects = await s3.listObjects({ prefix: 'folder/' });
await s3.deleteObjects({ keys: ['a', 'b'] });
```

## `/storage`

Provider-agnostic storage contract plus a local filesystem backend and an
S3-compatible backend. The package owns bytes; your app owns policy.

```ts
import {
	createLocalBackend,
	createS3Backend,
	createStorage
} from '@ponado-org/integrations/storage';

const storage = createStorage({
	defaultProvider: 'local',
	backends: {
		local: () => createLocalBackend('/var/lib/app/uploads'),
		s3: () => createS3Backend({ client: s3Client, bucket: 'uploads', ensureBucket: true })
	}
});

await storage.get().init();
await storage.get().put({ key: 'abc.txt', body, contentType: 'text/plain' });
const objects = await storage.get().list();
const result = await storage.get().open('abc.txt', { filename: 'abc.txt' });
```

Pass the provider stored with each record when reading (`storage.get(provider)`),
so files written before a backend switch keep resolving. `createS3Backend` takes
any structurally compatible client — including `createS3Client()` from `/s3` —
so this subpath itself carries no AWS SDK dependency.

## `/email`

Amazon SES client on nodemailer's SES transport, plus delivery tracking for
SES/SNS events. Dry-run mode, injected logger, optional `onSent` hook.
`sendEmail()` never throws.

```ts
import { createEmailClient } from '@ponado-org/integrations/email';

const email = createEmailClient({
	accessKeyId: process.env.SES_ACCESS_KEY!,
	secretAccessKey: process.env.SES_SECRET_ACCESS_KEY!,
	from: { address: 'noreply@example.com', name: 'My App' },
	region: 'eu-north-1',
	defaultHeaders: { 'Content-Language': 'lt' },
	dryRun: false,
	logger: console
});

await email.sendEmail({
	to: 'someone@example.com',
	subject: 'Hello',
	html: '<p>Hello</p>'
});
```

`defaultHeaders` is empty by default; pass `Content-Language` explicitly when
you want Gmail language detection. `onSent` is awaited after every attempted
send; its errors never change the result. Missing `to`/`subject`/`html` and
dry-run mode return `success: false` without touching SES.

### Delivery safety policy

`withEmailDeliveryPolicy()` wraps a client with a central outbound switch. The
app resolves its own environment/config and passes the mode and addresses in;
the package never reads env vars.

| Mode        | Behavior                                                                              |
| ----------- | ------------------------------------------------------------------------------------- |
| `live`      | Send to the real recipients.                                                          |
| `allowlist` | Send only when **every** recipient is in `recipients`; otherwise skip the whole send. |
| `redirect`  | Replace every recipient with `recipients`, prefix the subject with `[TEST] `.         |
| `off`       | Never call the provider.                                                              |

```ts
import { createEmailClient, withEmailDeliveryPolicy } from '@ponado-org/integrations/email';

const email = withEmailDeliveryPolicy(
	createEmailClient({
		accessKeyId: process.env.SES_ACCESS_KEY!,
		secretAccessKey: process.env.SES_SECRET_ACCESS_KEY!,
		from: 'noreply@example.com',
		logger: console
	}),
	{
		mode: 'redirect',
		recipients: ['you@example.com'],
		logger: console,
		// Optional: keep the intended recipients in your tracking meta.
		onRedirect: (props, originalRecipients) => ({
			...props,
			meta: { ...props.meta, originalTo: originalRecipients }
		})
	}
);
```

Skipped sends (`off`, non-allowlisted recipients, a test-list mode without
addresses) never reach the provider and never fire `onSent`. Recipient matching
is case-insensitive. Set `subjectPrefix: false` to keep the original subject in
redirect mode.

### Delivery tracking

`createEmailTracker()` records every send attempt through `onSent` and applies
SES events delivered by an SNS webhook. It needs a `EmailTrackingStore` — the
Ponado registry `email` block ships a Drizzle implementation; other projects
can implement the interface over their own tables.

```ts
import {
	createEmailClient,
	createEmailTracker,
	type EmailTrackingStore
} from '@ponado-org/integrations/email';

const tracker = createEmailTracker({
	store,
	logger: console,
	onStatusChange: (event) => eventBus.emit('email-status', event)
});

const email = createEmailClient({
	accessKeyId: process.env.SES_ACCESS_KEY!,
	secretAccessKey: process.env.SES_SECRET_ACCESS_KEY!,
	from: 'noreply@example.com',
	logger: console,
	onSent: tracker.recordAttempt
});

await email.sendEmail({
	to: 'someone@example.com',
	subject: 'Hello',
	html: '<p>Hello</p>',
	meta: {
		entityType: 'invoice',
		entityId: '42',
		scopeType: 'batch',
		scopeId: 'b1',
		createdBy: 'user-1'
	}
});
```

Point the SNS HTTPS subscription at a route that returns
`tracker.handleSnsNotification(request)`. The handler verifies the SNS
signature before touching the store, confirms subscriptions, ignores unknown
message ids, and never downgrades a delivered/bounced/complained send.

Statuses are readable strings (`pending`, `sent`, `delivered`, `bounced`,
`complained`, `failed`). `normalizeSesMessageId()` is exported for matching
SNS events to the id nodemailer returned.

## `/google-calendar`

Service-account Google Calendar client.

```ts
import {
	consoleLogger,
	createGoogleCalendarClient
} from '@ponado-org/integrations/google-calendar';

const calendar = createGoogleCalendarClient({
	serviceAccountJsonPath: process.env.GOOGLE_SERVICE_ACCOUNT_FILE,
	logger: consoleLogger
});

await calendar.init();

// Per-entity calendars are created explicitly:
const id = await calendar.createCalendar({ title: 'Person calendar' });
await calendar.invitePerson({ email: 'person@example.com', calendarId: id });

// Boot check: no calendar configured -> validates the credentials only
// (calendar list); pass a calendarId (or defaultCalendarId) to also verify
// access to a specific calendar.
await calendar.ping();
```

Requires a service account with the Calendar API enabled and the calendar shared
with the service account email. `init()` makes no requests and never creates
calendars — creation is explicit (`createCalendar()`), so booting can't spawn
stray calendars.

`ping(calendarId?)` is the boot check: with a calendar it validates access to
that calendar; without one it validates the credentials only (calendar list).

## `/stockx`

StockX API client (`StockxClient`) with built-in token exchange. No extra
dependencies; uses global `fetch`.
