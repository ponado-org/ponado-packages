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
import { consoleLogger, createGoogleCalendarClient } from '@ponado/google-calendar-client';

const calendarClient = createGoogleCalendarClient({
	serviceAccountJson: process.env.GOOGLE_SERVICE_ACCOUNT_JSON!,
	defaultCalendarId: process.env.GOOGLE_CALENDAR_ID, // optional
	calendarTitle: 'My App Calendar', // used only when creating a new calendar
	timeZone: 'Europe/Vilnius', // defaults to Europe/Vilnius
	logger: consoleLogger // optional, defaults to consoleLogger
});

await calendarClient.init();
```

If `defaultCalendarId` is omitted, a new calendar is created on `init()` and used for the lifetime of the process. Read it back via `calendarClient.defaultCalendarId` and persist it to reuse the same calendar across restarts.

`new GoogleCalendarClient()` + `configure(options)` is equivalent when you prefer constructing the class directly.

## API

### `configure(options)`

| Option               | Type     | Required | Description                                                             |
| -------------------- | -------- | -------- | ----------------------------------------------------------------------- |
| `serviceAccountJson` | `string` | ✓        | Raw JSON string of the service account credentials                      |
| `defaultCalendarId`  | `string` |          | Calendar used when a method is called without a `calendarId`            |
| `calendarTitle`      | `string` |          | Title for a calendar created by `init()`                                |
| `timeZone`           | `string` |          | Timezone for a calendar created by `init()` (default: `Europe/Vilnius`) |
| `logger`             | `Logger` |          | Logger instance (default: `consoleLogger`)                              |

### `init()`

Authenticates and connects the client. Creates a new calendar if no `defaultCalendarId` was provided. Must be called before any other method.

### `defaultCalendarId`

Getter for the calendar id used when a method receives no explicit `calendarId`.

### Calendars

```typescript
calendarClient.createCalendar({ title, timeZone }); // creates a calendar, returns its id
calendarClient.deleteCalendar(calendarId); // deletes a calendar
```

### Events

```typescript
calendarClient.listEvents(calendarId?)                    // upcoming events, ordered by start time
calendarClient.insertEvent({ event, calendarId? })        // insert a Calendar v3 event, returns Schema$Event
calendarClient.updateEvent({ eventId, event, calendarId? }) // update an event, returns Schema$Event
calendarClient.deleteEvent({ eventId, calendarId? })      // delete an event (410 already-deleted is silently ignored)
calendarClient.clearAllEvents(calendarId?)                // delete all upcoming events
```

### ACL / People

```typescript
calendarClient.listAcls(calendarId?)                      // raw ACL rules
calendarClient.listPeople(calendarId?)                    // [{ email, type, role }]
calendarClient.invitePerson({ email, role?, calendarId? }) // defaults to role "reader"
calendarClient.deletePerson({ email, calendarId? })       // remove a user from the calendar ACL
```

## Custom Logger

The package ships with `consoleLogger` but accepts anything that implements the `Logger` interface, including [pino](https://getpino.io/) directly.

```typescript
import { createGoogleCalendarClient, type Logger } from '@ponado/google-calendar-client';
import pino from 'pino';

const logger = pino();

// pino already satisfies the Logger interface
const calendarClient = createGoogleCalendarClient({ ...config, logger });
```

```typescript
export interface Logger {
	info(obj: object | string, msg?: string): void;
	warn(obj: object | string, msg?: string): void;
	error(obj: object | string, msg?: string): void;
}
```
