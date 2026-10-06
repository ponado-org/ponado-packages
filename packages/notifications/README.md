# @ponado/notifications

Framework-agnostic, typed event bus for notification logic. Zero dependencies.
Import it, define your own event union, wire handlers with your own transports.

> Requires Node >= 26.4 (uses `Map.prototype.getOrInsert`).

## Why

Instead of embedding "who gets an email when X happens" inside action handlers,
actions just **emit what happened**. Handlers — registered per event type —
decide recipients, content, and transport. This centralizes notification logic,
makes it testable, and lets a single event drive email, in-app alerts, etc.

## Usage

### 1. Define your events (app side)

```ts
type AppEvent =
	| { type: 'approval.status_changed'; approvalId: number; status: 'valid' | 'invalid' }
	| { type: 'document.uploaded'; documentId: number; ownerId: number };
```

### 2. Create an instance (app side, singleton)

```ts
import { NotificationBus } from '@ponado/notifications';

export const notifications = new NotificationBus<AppEvent>({ logger: console });
```

### 3. Register handlers (once, at app init)

```ts
notifications.register('approval.status_changed', async (event) => {
	// query recipients, render template, send email...
	await sendEmail({ to: creator, subject: '...' });
});

// or register a whole map:
notifications.registerMany({
	'document.uploaded': async (event) => {
		/* ... */
	}
});
```

### 4. Emit from the action

```ts
await db.transaction(async (tx) => saveSomething(tx, data)); // commit first!
notifications.emitAndForget({ type: 'approval.status_changed', approvalId, status });
```

## Rules

- **Emit after the transaction commits** — never inside it, or a rollback sends emails.
- **Keep payloads minimal** — handlers re-query the DB for what they need, so the
  event is a fact ("what happened"), not a snapshot.
- **One handler = one concern.** Register several handlers per event if needed.
- `emit()` never throws: handler errors are isolated, collected in `EmitResult`,
  and logged. Use `await emit()` when you must know the outcome, `emitAndForget()`
  otherwise.

## API

| Member            | Description                                                     |
| ----------------- | --------------------------------------------------------------- |
| `register()`      | Add a handler for a type; returns an unsubscribe fn             |
| `registerMany()`  | Register an object map of type → handler; returns unsubscribe   |
| `emit()`          | Run handlers (sequential by default, `mode: "parallel"` opt-in) |
| `emitAndForget()` | Fire-and-forget variant                                         |
| `hasHandlers()`   | True when at least one handler is registered for the type       |
| `clear()`         | Remove all handlers                                             |
