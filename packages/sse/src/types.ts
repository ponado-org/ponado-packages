/**
 * Typed minimal SSE helpers — shared types.
 */

/** Payload of a parsed named/message event. */
export type SseEvent = {
	event?: string;
	data: string;
};

export type SseHandlers = {
	/** Fired when the connection opens (EventSource onopen). */
	onOpen?: () => void;
	/** Fired for every `message` event. */
	onMessage?: (event: MessageEvent) => void;
	/** Fired on connection errors (EventSource auto-reconnects natively). */
	onError?: (error: Event) => void;
};

export type SseClient = {
	/** Closes the connection permanently. */
	close: () => void;
	/** Current readyState of the underlying EventSource. */
	readonly readyState: number;
};
