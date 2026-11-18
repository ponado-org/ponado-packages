# @ponado-org/utils

Zero-dependency, browser-safe utilities. One package, one version, subpath
imports. There is no root export on purpose: importing a subpath is the only
way in, so a bundler can never pull in features you didn't ask for.

| Subpath          | What it gives you                                             |
| ---------------- | ------------------------------------------------------------- |
| `/date`          | Date maths and Lithuanian date formatting                     |
| `/lt`            | Lithuanian declension, holidays, amounts, filename sanitizing |
| `/shortcuts`     | Keyboard shortcut normalization, matching and platform labels |
| `/notifications` | Typed in-process notification bus                             |
| `/sse`           | Fetch-based typed SSE client                                  |
| `/sse/server`    | SSE stream/channel helpers for server handlers                |

No runtime dependencies. Works in Node 20+, browsers, and edge runtimes
(`/sse/server` uses Web Streams, not `node:stream`).

```bash
pnpm add @ponado-org/utils
```

## `/date`

```ts
import {
	calculateAge,
	getVerbalDate,
	getDifferenceInDays,
	formatDaysDifference,
	getDaysUntilAnniversary
} from '@ponado-org/utils/date';

calculateAge(new Date('1990-05-15')); // full years, UTC-safe
getVerbalDate(new Date(2024, 4, 9)); // "2024 m. gegužės 9 d."
getDifferenceInDays(date1, date2); // whole days between dates
formatDaysDifference(5); // "5 d."
formatDaysDifference(0); // "šiandien"
getDaysUntilAnniversary(birthDate);
```

## `/lt`

```ts
import {
	declineName,
	declineFullName,
	getVerbalAmount,
	getLithuanianHolidays,
	isHoliday,
	isDayOff,
	sanitizeFilename,
	normalizeLithuanianLetters
} from '@ponado-org/utils/lt';

declineFullName('Jonas Petraitis', 'kilmininkas');
getVerbalAmount(1234.56); // "tūkstantis du šimtai trisdešimt keturi eurai 56 ct"
isHoliday(new Date('2024-02-16')); // true
sanitizeFilename('file:name?.txt'); // "filename.txt"
normalizeLithuanianLetters('ąčęėįšųūž'); // "aceeisuuz"
```

Cases: `vardininkas`, `kilmininkas`, `naudininkas`, `galininkas`, `inagininkas`,
`vietininkas`, `šauksmininkas`.

## `/shortcuts`

```ts
import { handleShortcuts, KeyCode, shortcutLabel } from '@ponado-org/utils/shortcuts';

handleShortcuts(event, [{ code: KeyCode.S, mod: true, handler: () => save() }]);

shortcutLabel({ code: KeyCode.S, mod: true }); // "⌘ + S" on mac, "Ctrl + S" elsewhere
```

`handleShortcuts` only calls `event.preventDefault()` when a shortcut matches,
and skips typing targets (inputs, textareas, selects, contenteditable) unless
configured otherwise.

## `/notifications`

Emit facts ("what happened"); handlers decide recipients, content and transport.

```ts
import { NotificationBus } from '@ponado-org/utils/notifications';

type AppEvent =
	| { type: 'approval.status_changed'; approvalId: number; status: 'valid' | 'invalid' }
	| { type: 'document.uploaded'; documentId: number; ownerId: number };

export const notifications = new NotificationBus<AppEvent>({ logger: console });

notifications.register('document.uploaded', async (event) => {
	await sendEmail(event.ownerId);
});

notifications.emitAndForget({ type: 'document.uploaded', documentId: 1, ownerId: 2 });
```

Rules that keep this sane:

- emit **after** the database transaction commits;
- keep payloads minimal (IDs, not snapshots) — handlers re-query;
- `emit()` never throws; handler errors are isolated and returned in `EmitResult`.

## `/sse`

Client uses `fetch` + `ReadableStream`, so it supports POST bodies, headers and
auth cookies that `EventSource` can't.

```ts
import { SseClient } from '@ponado-org/utils/sse';

type MyEvents = {
	progress: { done: number; total: number };
	complete: { ok: boolean };
};

const client = new SseClient<MyEvents>('/api/export', {
	method: 'POST',
	headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify({ id: 1 })
});

const off = client.on('progress', ({ done, total }) => console.log(`${done}/${total}`));
await client.connect();
off();
client.close();
```

Pass `{ reconnect: true }` to retry transport errors with exponential backoff.

Server helpers:

```ts
import { createSseChannel, SSE_HEADERS } from '@ponado-org/utils/sse/server';

export const GET = () => {
	const channel = createSseChannel<MyEvents>();
	channel.send('progress', { done: 1, total: 10 });
	channel.close();
	return channel.response; // headers already set
};
```

`createSseStream()` bridges a shared bus (cron jobs, webhooks) to many clients;
`createSseChannel()` is the imperative request-scoped variant.
