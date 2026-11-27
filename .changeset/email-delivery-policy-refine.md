---
'@ponado-org/integrations': minor
---

Refine `withEmailDeliveryPolicy` before wider adoption:

- Rename the normal mode from `live` to `direct` — it describes the behavior
  (send to the addressed recipients) instead of an environment.
- Rename `recipients` to `testRecipients` and make the policy a discriminated
  union, so `testRecipients` exists only in `allowlist` and `redirect` mode.
- `direct` and `off` no longer accept unused recipient lists.
