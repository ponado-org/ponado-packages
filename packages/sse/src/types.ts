/**
 * Shared SSE types. Framework-agnostic - importable from both client and
 * server code.
 */

/**
 * A map of event name -> payload type. Used to keep server and client in sync
 * with full type safety on both ends.
 *
 * @example
 * ```ts
 * type MyEvents = {
 * 	progress: { done: number; total: number };
 * 	complete: { ok: boolean };
 * 	error: { message: string };
 * };
 * ```
 */
export type SseEventMap = Record<string, unknown>;

/** A single typed event, as sent by the server and received by the client. */
export type SseEvent<TMap extends SseEventMap, K extends keyof TMap = keyof TMap> = {
	type: K;
	data: TMap[K];
};
