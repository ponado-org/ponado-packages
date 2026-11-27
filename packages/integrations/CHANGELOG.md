# @ponado-org/integrations

## 0.6.0

### Minor Changes

- 9b88b8d: Refine `withEmailDeliveryPolicy` before wider adoption:

    - Rename the normal mode from `live` to `direct` — it describes the behavior
      (send to the addressed recipients) instead of an environment.
    - Rename `recipients` to `testRecipients` and make the policy a discriminated
      union, so `testRecipients` exists only in `allowlist` and `redirect` mode.
    - `direct` and `off` no longer accept unused recipient lists.

## 0.5.0

### Minor Changes

- e9c0f59: Add `withEmailDeliveryPolicy` to the email subpath: a central outbound
  delivery switch (`live`, `allowlist`, `redirect`, `off`) with an `onRedirect`
  hook for tracking the intended recipients. Apps keep resolving their own
  environment/config; the package owns only the mode mechanics.

    Skipped sends never reach the provider and never fire `onSent`.

## 0.4.0

### Minor Changes

- Google Calendar client: `init()` no longer auto-creates a calendar when
  `defaultCalendarId` is omitted — that side effect spawned a stray calendar on
  every boot of apps without a shared calendar (and forced a placeholder env var
  just to suppress it). Calendar creation is now explicit (`createCalendar()`),
  `calendarTitle`/`timeZone` client options are gone (they exist on
  `createCalendar`), and `ping()` without any calendar id falls back to a
  credential-only check (calendar list).

## 0.3.6

### Patch Changes

- Remove `EmailClient.ping()`: the GetAccount-based check demanded an extra IAM
  action just for health monitoring. Boot validation should not drive IAM policy
  changes — apps that want a check should use read-only calls their credentials
  already allow or config validation.

## 0.3.5

### Patch Changes

- `EmailClient.ping()`: boot-time SES check — reads the account sending status
  (GetAccount) with the configured credentials/region and throws when the
  credentials are rejected or sending is disabled for the account.

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
