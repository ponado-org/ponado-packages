import type { SseEventMap } from './types.js';

const encoder = new TextEncoder();

/** Standard Server-Sent Events response headers. */
export const SSE_HEADERS: Record<string, string> = {
	'content-type': 'text/event-stream',
	'cache-control': 'no-cache, no-transform',
	connection: 'keep-alive',
	'x-accel-buffering': 'no'
};

/** Encodes a single SSE event frame (`event:` + JSON `data:`). */
export function encodeSseEvent(type: string, data: unknown): Uint8Array {
	return encoder.encode(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
}

/**
 * Minimal subscribe surface a bus must provide. Structural - anything with
 * `on`/`off` works (EventEmitter, a wrapper class, Redis pub/sub adapter, ...).
 */
export type SseBus = {
	on(event: string | symbol, listener: (...args: unknown[]) => void): unknown;
	off(event: string | symbol, listener: (...args: unknown[]) => void): unknown;
};

export type SendFn<TMap extends SseEventMap> = <K extends keyof TMap>(
	type: K,
	data: TMap[K]
) => void;

/**
 * Bridges a shared `EventEmitter`-based bus to a Server-Sent Events stream.
 * Each subscribed `event` emitted on the bus is forwarded to the client.
 *
 * This is the right primitive when events originate *outside* the request
 * lifecycle (cron jobs, webhooks, notifications, ...) and need to be broadcast
 * to any number of connected clients.
 */
export function createSseStream<TMap extends SseEventMap>(props: {
	bus: SseBus;
	events: readonly (keyof TMap)[];
	/** Called on connect - useful for replaying the current state (snapshot). */
	initial?: (send: SendFn<TMap>) => void;
	/** Optional keep-alive ping interval in ms. */
	heartbeatMs?: number;
	/** Return `false` to drop an event before it reaches the client. */
	filter?: <K extends keyof TMap>(type: K, data: TMap[K]) => boolean;
}): ReadableStream<Uint8Array> {
	const listeners = new Map<keyof TMap, (data: unknown) => void>();
	let closed = false;
	let heartbeat: ReturnType<typeof setInterval> | undefined;

	const cleanup = () => {
		if (closed) return;
		closed = true;
		if (heartbeat) clearInterval(heartbeat);
		for (const [event, handler] of listeners) {
			props.bus.off(String(event), handler);
		}
		listeners.clear();
	};

	return new ReadableStream<Uint8Array>({
		start(controller) {
			const enqueue = (type: string, data: unknown) => {
				if (closed) return;
				try {
					controller.enqueue(encodeSseEvent(type, data));
				} catch {
					cleanup();
				}
			};

			const send: SendFn<TMap> = (type, data) => enqueue(String(type), data);

			// Flush response headers immediately - otherwise the first `fetch`
			// on the client won't resolve until the next event/heartbeat.
			controller.enqueue(encoder.encode(': connected\n\n'));

			for (const event of props.events) {
				const handler = (data: unknown) => {
					if (
						props.filter &&
						!props.filter(event as keyof TMap, data as TMap[keyof TMap])
					) {
						return;
					}
					enqueue(String(event), data);
				};
				listeners.set(event, handler);
				props.bus.on(String(event), handler);
			}

			if (props.heartbeatMs && props.heartbeatMs > 0) {
				heartbeat = setInterval(() => {
					if (closed) return;
					try {
						controller.enqueue(encoder.encode(': ping\n\n'));
					} catch {
						cleanup();
					}
				}, props.heartbeatMs);
			}

			props.initial?.(send);
		},
		cancel() {
			cleanup();
		}
	});
}

export type SseChannel<TMap extends SseEventMap> = {
	/** Full `Response` ready to return from a `+server.ts` endpoint. */
	response: Response;
	send: SendFn<TMap>;
	close: () => void;
};

/**
 * Imperative, request-scoped SSE stream. Use this when the work happens
 * *inside* the request itself (e.g. a long-running export) and progress
 * should be pushed back to the client over the same request.
 *
 * `send` is a no-op after the stream is closed / the client disconnects.
 */
export function createSseChannel<TMap extends SseEventMap>(): SseChannel<TMap> {
	let controller: ReadableStreamDefaultController<Uint8Array> | undefined;
	let closed = false;

	const stream = new ReadableStream<Uint8Array>({
		start(c) {
			controller = c;
		},
		cancel() {
			closed = true;
		}
	});

	const send: SendFn<TMap> = (type, data) => {
		if (closed) return;
		try {
			controller?.enqueue(encodeSseEvent(String(type), data));
		} catch {
			// stream already closed
		}
	};

	const close = () => {
		if (closed) return;
		closed = true;
		try {
			controller?.close();
		} catch {
			// already closed
		}
	};

	return {
		response: new Response(stream, { headers: SSE_HEADERS }),
		send,
		close
	};
}
