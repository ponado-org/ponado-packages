---
'@ponado-org/integrations': minor
---

Add `withEmailDeliveryPolicy` to the email subpath: a central outbound
delivery switch (`live`, `allowlist`, `redirect`, `off`) with an `onRedirect`
hook for tracking the intended recipients. Apps keep resolving their own
environment/config; the package owns only the mode mechanics.

Skipped sends never reach the provider and never fire `onSent`.
