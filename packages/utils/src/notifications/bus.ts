import type {
	EmitOptions,
	EmitResult,
	NotificationEvent,
	NotificationHandler,
	NotificationLogger
} from './types.js';

type AnyHandler = NotificationHandler<NotificationEvent>;

/**
 * Typed in-process notification bus.
 *
 * The app owns the instance and the event union:
 *
 * ```ts
 * const notifications = new NotificationBus<AppEvent>({ logger: console });
 *
 * notifications.register('approval.status_changed', async (event) => {
 * 	// decide recipients + content here
 * });
 *
 * await notifications.emit({ type: 'approval.status_changed', approvalId: 5 });
 * ```
 *
 * Properties:
 * - `emit` never throws — handler errors are isolated and collected in the result.
 * - Handlers run in registration order by default (sequential); `mode: "parallel"` opts out.
 * - `register` returns an unsubscribe function.
 */
export class NotificationBus<TEvents extends NotificationEvent> {
	#handlers = new Map<string, AnyHandler[]>();
	#logger: NotificationLogger | undefined;

	constructor(options: { logger?: NotificationLogger } = {}) {
		this.#logger = options.logger;
	}

	register<TType extends TEvents['type']>(
		type: TType,
		handler: NotificationHandler<Extract<TEvents, { type: TType }>>
	): () => void {
		const handlers = this.#handlers.get(type);
		if (handlers) {
			handlers.push(handler as AnyHandler);
		} else {
			this.#handlers.set(type, [handler as AnyHandler]);
		}

		return () => {
			const current = this.#handlers.get(type);
			if (!current) return;
			const index = current.indexOf(handler as AnyHandler);
			if (index !== -1) current.splice(index, 1);
			if (current.length === 0) this.#handlers.delete(type);
		};
	}

	registerMany(handlers: {
		[K in TEvents['type']]?: NotificationHandler<Extract<TEvents, { type: K }>>;
	}): () => void {
		const unsubscribers = (Object.entries(handlers) as [TEvents['type'], AnyHandler][]).map(
			([type, handler]) => this.register(type, handler)
		);
		return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
	}

	hasHandlers(type: TEvents['type']): boolean {
		return (this.#handlers.get(type)?.length ?? 0) > 0;
	}

	async emit(event: TEvents, options: EmitOptions = {}): Promise<EmitResult> {
		const handlers = this.#handlers.get(event.type) ?? [];
		const errors: EmitResult['errors'] = [];
		let successful = 0;

		const run = async (handler: AnyHandler) => {
			try {
				await handler(event);
				successful++;
			} catch (error) {
				errors.push({ handler, error });
				this.#logger?.error({ error, event }, 'Notification handler failed');
			}
		};

		if (options.mode === 'parallel') {
			await Promise.all(handlers.map(run));
		} else {
			for (const handler of handlers) {
				await run(handler);
			}
		}

		return { successful, failed: errors.length, errors };
	}

	/** Fire-and-forget variant — failures are logged, never thrown to the caller. */
	emitAndForget(event: TEvents, options?: EmitOptions): void {
		void this.emit(event, options);
	}

	clear(): void {
		this.#handlers.clear();
	}
}
