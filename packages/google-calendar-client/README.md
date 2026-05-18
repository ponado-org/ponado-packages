# @ponado/google-calendar-client

Internal package for managing a Google Calendar via a service account. Wraps the `@googleapis/calendar` v3 API with a simple, stateful client.

## Installation

```bash
pnpm add @ponado/google-calendar-client
```

## Setup

The client requires a Google service account with the **Google Calendar API** enabled and the calendar shared with the service account email.

## Usage

```typescript
import { calendarClient, consoleLogger } from '@ponado/google-calendar-client';

calendarClient.configure({
  serviceAccountJson: process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
  calendarTitle: 'My App Calendar',   // used only when creating a new calendar
  timeZone: 'Europe/Vilnius',         // defaults to Europe/Vilnius
  logger: consoleLogger,              // optional, defaults to consoleLogger
});

await calendarClient.init();
```

If `calendarId` is omitted, a new calendar is created on first `init()` and the ID is stored in memory. To reuse an existing calendar across restarts, persist the ID and pass it as `calendarId`.

```typescript
calendarClient.configure({
  serviceAccountJson: process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
  calendarId: process.env.GOOGLE_CALENDAR_ID,
});
```

## API

### `configure(options)`

| Option | Type | Required | Description |
|---|---|---|---|
| `serviceAccountJson` | `string` | ✓ | Raw JSON string of the service account credentials |
| `calendarId` | `string` | | ID of an existing calendar to use |
| `calendarTitle` | `string` | | Title for a newly created calendar |
| `timeZone` | `string` | | Timezone for a newly created calendar (default: `Europe/Vilnius`) |
| `logger` | `Logger` | | Logger instance (default: `consoleLogger`) |

### `init()`

Authenticates and connects the client. Creates a new calendar if no `calendarId` was provided. Must be called before any other method.

### Events

```typescript
calendarClient.listEvents()                          // upcoming events, ordered by start time
calendarClient.insertEvent(event)                    // insert a Calendar v3 event, returns Schema$Event
calendarClient.updateEvent({ eventId, event })       // update an existing event, returns Schema$Event
calendarClient.deleteEvent(eventId)                  // delete an event (410 already-deleted is silently ignored)
calendarClient.clearAllEvents()                      // delete all upcoming events
```

### ACL / People

```typescript
calendarClient.listAcls()                            // raw ACL rules
calendarClient.listPeople()                          // [{ email, type, role }]
calendarClient.deletePerson({ email })               // remove a user from the calendar ACL
```

## Custom Logger

The package ships with `consoleLogger` but accepts anything that implements the `Logger` interface, including [pino](https://getpino.io/) directly.

```typescript
import { Logger } from '@ponad/google-calendar-client';
import pino from 'pino';

const logger = pino();

// pino already satisfies the Logger interface
calendarClient.configure({ ..., logger });
```

```typescript
export interface Logger {
  info(obj: object | string, msg?: string): void;
  warn(obj: object | string, msg?: string): void;
  error(obj: object | string, msg?: string): void;
}
```
