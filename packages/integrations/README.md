# @ponado/integrations

Node integrations in one package with subpath exports. The package itself
installs **nothing**; each subpath's SDK is an optional peer dependency, so an
app only downloads what it uses.

| Subpath            | Install alongside                                                  |
| ------------------ | ------------------------------------------------------------------ |
| `/storage`         | –                                                                  |
| `/stockx`          | –                                                                  |
| `/s3`              | `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `file-type` |
| `/email`           | `@aws-sdk/client-sesv2`, `nodemailer`                              |
| `/google-calendar` | `@googleapis/calendar`, `google-auth-library`                      |

```bash
pnpm add @ponado/integrations @aws-sdk/client-s3 @aws-sdk/s3-request-presigner file-type
```

If you import a subpath whose peer isn't installed, the import fails immediately
with a normal `ERR_MODULE_NOT_FOUND` for that SDK — nothing else is affected.

## `/s3`

AWS S3 (and S3-compatible, e.g. MinIO) wrapper with file-type detection,
signed URLs, batch deletes and bucket cloning.

```ts
import { createS3Client } from '@ponado/integrations/s3';

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
import { createLocalBackend, createS3Backend, createStorage } from '@ponado/integrations/storage';

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

Amazon SES client on nodemailer's SES transport. Dry-run mode, injected logger,
optional `onSent` hook. `sendEmail()` never throws.

```ts
import { createEmailClient } from '@ponado/integrations/email';

const email = createEmailClient({
	accessKeyId: process.env.SES_ACCESS_KEY!,
	secretAccessKey: process.env.SES_SECRET_ACCESS_KEY!,
	from: { address: 'noreply@example.com', name: 'My App' },
	region: 'eu-north-1',
	dryRun: false,
	logger: console,
	onSent: async ({ props, result }) => recordAttempt({ meta: props.meta, result })
});

await email.sendEmail({
	to: 'someone@example.com',
	subject: 'Hello',
	html: '<p>Hello</p>',
	meta: { packetId: 42 } // opaque, returned to onSent
});
```

`onSent` is awaited after every attempted send; its errors never change the
result. Missing `to`/`subject`/`html` and dry-run mode return `success: false`
without touching SES.

## `/google-calendar`

Service-account Google Calendar client.

```ts
import { consoleLogger, createGoogleCalendarClient } from '@ponado/integrations/google-calendar';

const calendar = createGoogleCalendarClient({
	serviceAccountJson: process.env.GOOGLE_SERVICE_ACCOUNT_JSON!,
	defaultCalendarId: process.env.GOOGLE_CALENDAR_ID,
	calendarTitle: 'My App Calendar',
	timeZone: 'Europe/Vilnius',
	logger: consoleLogger
});

await calendar.init();
```

Requires a service account with the Calendar API enabled and the calendar shared
with the service account email. If `defaultCalendarId` is omitted, `init()`
creates a calendar and `defaultCalendarId` exposes the new id — persist it.

## `/stockx`

StockX API client (`StockxClient`) with built-in token exchange. No extra
dependencies; uses global `fetch`.
