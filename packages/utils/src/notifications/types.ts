/** Base shape of a notification event. Extend with a `type` and any payload fields. */
export type NotificationEvent = { type: string };

/** A handler that reacts to an event. Errors are caught by the bus and isolated per handler. */
export type NotificationHandler<TEvent extends NotificationEvent = NotificationEvent> = (
	event: TEvent
) => void | Promise<void>;

/** Minimal logger contract — pass `console` or your app logger. */
export interface NotificationLogger {
	error(message: unknown, ...args: unknown[]): void;
	warn?(message: unknown, ...args: unknown[]): void;
}

export type EmitMode = 'sequential' | 'parallel';

export type EmitOptions = {
	/** How handlers of one event run. Default: `sequential` (predictable order, e.g. emails). */
	mode?: EmitMode;
};

export type EmitResult = {
	successful: number;
	failed: number;
	errors: { handler: NotificationHandler; error: unknown }[];
};
