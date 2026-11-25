---
kind: code
---

# The closing setup step says whether the installation checks passed

## Why
Board HuInrichten (humaniq) closes the setup wizard with a line under the recap: "Controle geslaagd: register geïmporteerd met 54 schema's, achtergrondtaken draaien, loonpakket 2026 geladen." The manifest schema already accepted `healthCheck: true` on a `summary` step, but CnSetupWizard drew nothing for it. On the same step the recap's Change button shrank to "Wi…" beside a long value.

## What changes
- A `summary` step with `healthCheck: true` draws one line under the recap from the `health` block of the app's setup status (`GET /apps/{appId}/api/setup/status`): `{ ok, checks: [{ label, ok }] }`. When every check passes it names them all after "Check passed:". Otherwise it names only the failing checks after "Check found a problem:". Labels go through the app's translate.
- Without a `health` block, or without `healthCheck`, nothing is drawn, so an app that reports no health keeps the recap it had.
- The recap's Change button no longer shrinks. A long value wraps instead.
