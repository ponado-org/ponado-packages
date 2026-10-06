import type { SseEventMap } from './types.js';

/** Connection lifecycle state of an {@link SseClient}. */
export type SseStatus = 'idle' | 'connecting' | 'open' | 'closed' | 'error';

export type SseClientOptions = {
	/** Retry transport errors with exponential backoff. Defaults to `false`. */
	reconnect?: boolean;
};

/** Notified whenever the client's `status`/`error` change. */
export type SseStatusListener = (status: SseStatus, error: string | null) => void;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Typed Server-Sent Events client.
 *
 * Uses `fetch` + a `ReadableStream` reader rather than the native
 * `EventSource`, so it supports POST bodies, custom headers and auth cookies.
 *
 * @example
 * ```ts
 * type MyEvents = {
 * 	progress: { done: number; total: number };
 * };
 *
 * const client = new SseClient<MyEvents>('/api/export', {
 * 	method: 'POST',
 * 	headers: { 'Content-Type': 'application/json' },
 * 	body: JSON.stringify({ id: 1 })
 * });
 *
 * const off = client.on('progress', (p) => console.log(p));
 * await client.connect();
 * ```
 */
export class SseClient<TMap extends SseEventMap> {
	status: SseStatus = 'idle';
	error: string | null = null;

	#url: string;
	#init?: RequestInit;
	#reconnect: boolean;
	#controller: AbortController | null = null;
	#closedByUser = false;
	#handlers = new Map<keyof TMap, Set<(data: unknown) => void>>();
	#statusListeners = new Set<SseStatusListener>();

	constructor(url: string, init?: RequestInit, options?: SseClientOptions) {
		this.#url = url;
		this.#init = init;
		this.#reconnect = options?.reconnect ?? false;
	}

	/** Subscribe to a typed event. Returns an unsubscribe function. */
	on<K extends keyof TMap>(type: K, handler: (data: TMap[K]) => void): () => void {
		let set = this.#handlers.get(type);
		if (!set) {
			set = new Set();
			this.#handlers.set(type, set);
		}
		set.add(handler as (data: unknown) => void);
		return () => this.off(type, handler);
	}

	off<K extends keyof TMap>(type: K, handler: (data: TMap[K]) => void): void {
		this.#handlers.get(type)?.delete(handler as (data: unknown) => void);
	}

	/**
	 * Subscribe to `status`/`error` changes. Calls back immediately with the
	 * current state, then on every change. Returns an unsubscribe function.
	 */
	subscribe(listener: SseStatusListener): () => void {
		this.#statusListeners.add(listener);
		listener(this.status, this.error);
		return () => {
			this.#statusListeners.delete(listener);
		};
	}

	/**
	 * Opens the connection and reads until the stream ends (or `close()` is
	 * called). If `reconnect` is enabled, transport errors are retried with
	 * backoff.
	 */
	async connect(): Promise<void> {
		if (this.status === 'connecting' || this.status === 'open') return;
		this.#closedByUser = false;

		let attempt = 0;

		while (true) {
			const controller = new AbortController();
			this.#controller = controller;
			this.#setStatus('connecting', null);

			const shouldRetry = await this.#runOnce(controller, () => {
				attempt = 0;
			});

			this.#controller = null;

			if (!shouldRetry || this.#closedByUser) return;

			const delay = Math.min(250 * 2 ** attempt, 10_000);
			attempt += 1;
			await sleep(delay);

			if (this.#closedByUser) return;
		}
	}

	/** Closes the connection permanently (until `connect()` is called again). */
	close(): void {
		this.#closedByUser = true;
		this.#controller?.abort();
		this.#setStatus('closed');
	}

	#setStatus(status: SseStatus, error: string | null = this.error): void {
		this.status = status;
		this.error = error;
		for (const listener of this.#statusListeners) listener(status, error);
	}

	/** @returns whether a reconnect should be attempted. */
	async #runOnce(controller: AbortController, onConnect: () => void): Promise<boolean> {
		try {
			const response = await fetch(this.#url, { ...this.#init, signal: controller.signal });

			if (!response.ok) {
				throw new Error(`SSE request failed: ${response.status} ${response.statusText}`);
			}

			if (!response.body) {
				throw new Error('SSE response has no body');
			}

			this.#setStatus('open', null);
			onConnect();

			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let buffer = '';

			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					buffer += decoder.decode(value, { stream: true });

					let index;
					while ((index = buffer.indexOf('\n\n')) !== -1) {
						const raw = buffer.slice(0, index);
						buffer = buffer.slice(index + 2);
						this.#dispatch(raw);
					}
				}
			} finally {
				reader.releaseLock();
			}

			this.#setStatus('closed');
			return this.#reconnect && !this.#closedByUser;
		} catch (err) {
			if (controller.signal.aborted || this.#closedByUser) {
				this.#setStatus('closed');
				return false;
			}
			this.#setStatus('error', err instanceof Error ? err.message : String(err));
			return this.#reconnect;
		}
	}

	#dispatch(raw: string): void {
		const lines = raw.split('\n');
		let event: string | undefined;
		const dataLines: string[] = [];

		for (const line of lines) {
			if (line === '' || line.startsWith(':')) continue;
			if (line.startsWith('event:')) {
				event = line.slice(6).trim();
			} else if (line.startsWith('data:')) {
				const value = line.slice(5);
				dataLines.push(value.startsWith(' ') ? value.slice(1) : value);
			}
			// `id:` and `retry:` are ignored by this client.
		}

		if (event === undefined || dataLines.length === 0) return;

		const dataText = dataLines.join('\n');
		let data: unknown = dataText;
		try {
			data = JSON.parse(dataText);
		} catch {
			// non-JSON payload - pass through as raw text
		}

		const handlers = this.#handlers.get(event as keyof TMap);
		handlers?.forEach((handler) => handler(data));
	}
}
