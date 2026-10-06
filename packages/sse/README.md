# @ponado/sse

Typed Server-Sent Events helpers — a fetch-based client (POST bodies, custom
headers, auth cookies, typed event maps) and framework-free server stream
primitives. Zero dependencies.

## Client

`SseClient` uses `fetch` + a `ReadableStream` reader instead of the native
`EventSource`, so it supports POST bodies, custom headers and auth cookies.
Event payloads are parsed as JSON (falling back to raw text) and dispatched to
typed handlers.

```ts
import { SseClient } from '@ponado/sse';

type MyEvents = {
	progress: { done: number; total: number };
	complete: { ok: boolean };
};

const client = new SseClient<MyEvents>('/api/export', {
	method: 'POST',
	headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify({ id: 1 })
});

const offStatus = client.subscribe((status, error) => {
	console.log(status, error);
});

const offProgress = client.on('progress', ({ done, total }) => {
	console.log(`${done}/${total}`);
});

await client.connect();
// later:
offProgress();
offStatus();
client.close();
```

Pass `{ reconnect: true }` to retry transport errors with exponential backoff
(250 ms → 10 s).

## Server

Import server helpers from the `./server` subpath:

```ts
import { createSseChannel, SSE_HEADERS } from '@ponado/sse/server';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => {
	const channel = createSseChannel<MyEvents>();

	channel.send('progress', { done: 1, total: 10 });
	channel.send('complete', { ok: true });
	channel.close();

	return channel.response; // headers already set
};
```

- `createSseChannel<TMap>()` — imperative, request-scoped stream. Use when the
  work happens inside the request (long-running exports, progress reporting).
  `send()` is a no-op after `close()` or client disconnect.
- `createSseStream<TMap>({ bus, events, ... })` — bridges a shared
  `EventEmitter`-style bus (cron jobs, webhooks, notifications) to any number
  of clients. Supports `initial` snapshots, per-event `filter` and
  `heartbeatMs` keep-alive pings.
- `SSE_HEADERS` / `encodeSseEvent(type, data)` — the raw building blocks.

```ts
import { createSseStream, SSE_HEADERS } from '@ponado/sse/server';

const stream = createSseStream<MyEvents>({
	bus: appEventBus,
	events: ['progress', 'complete'],
	heartbeatMs: 25_000,
	filter: (_type, payload) => payload.userId === user.id
});

return new Response(stream, { headers: SSE_HEADERS });
```

## Types

```ts
import type { SseEvent, SseEventMap } from '@ponado/sse';

type MyEvents = {
	progress: { done: number; total: number };
} satisfies SseEventMap;
```
