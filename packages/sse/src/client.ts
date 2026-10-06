/**
 * Minimal SSE client — browser `EventSource` (built-in auto-reconnect).
 *
 * ```ts
 * const sse = createSseClient('/api/stream', {
 *   onMessage: (event) => console.log(event.data),
 * });
 * ```
 */
import type { SseClient, SseHandlers } from './types.js';

export function createSseClient(url: string | URL, handlers: SseHandlers = {}): SseClient {
	let source: EventSource | null = null;
	let closed = false;

	function connect() {
		if (closed) return;
		source?.close();
		source = new EventSource(url);
		source.onopen = () => handlers.onOpen?.();
		source.onmessage = (event) => handlers.onMessage?.(event);
		source.onerror = (error) => handlers.onError?.(error);
	}

	connect();

	return {
		close() {
			closed = true;
			source?.close();
			source = null;
		},
		get readyState() {
			return source?.readyState ?? EventSource.CLOSED;
		}
	};
}
