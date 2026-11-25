# @ponado-org/integrations

## 0.3.4

### Patch Changes

- `GoogleCalendarClient.ping(calendarId?)`: cheap boot-time credential check — a
  `calendars.get` that resolves only when the key is valid, the Calendar API is
  enabled and the calendar is accessible. Errors are contextualized with the
  calendar id.

## 0.3.3

### Patch Changes

- The Google Calendar client accepts the service-account key as a **file path**
  (`serviceAccountJsonPath`) or via `GOOGLE_APPLICATION_CREDENTIALS`, in addition
  to inline JSON — so deployments can mount the key file instead of embedding the
  JSON in an env var. `serviceAccountJson` is now optional.

## 0.3.2

### Patch Changes

- Add `configurationSetName` (client default and per-send) so outgoing email can
  be tagged with an SES configuration set, which is required for SES event
  destinations to publish delivery events to SNS.

## 0.3.1

### Patch Changes

- Load the SES transport on first send, so importing `/email` for delivery
  tracking no longer requires `@aws-sdk/client-sesv2` or `nodemailer`.

## 0.3.0

### Minor Changes

- Add server-side email delivery tracking to the `/email` subpath:
  `createEmailTracker`, the `EmailTrackingStore` seam, string `EmailSendStatus`
  values, SNS signature verification, SES event parsing and status transitions.
  Add `defaultHeaders` to the email client so `Content-Language` (and other
  headers) are app policy instead of a hardcoded `lt`.

## 0.2.0

### Minor Changes

- 619590e: Stop declaring subpath libraries as peer dependencies. GitHub Packages strips
  `peerDependenciesMeta` from its metadata, so pnpm installed every heavy SDK as
  a required dependency. The libraries are now documented in
  `subpathDependencies` and installed only by consumers that use the subpath.
