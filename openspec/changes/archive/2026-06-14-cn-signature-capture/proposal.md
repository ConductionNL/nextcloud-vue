# CnSignatureCapture — typed + drawn signature widget

## Why

The scholiq triage flagged `SignPlanModal` (signature flow for learning plans) as a custom because no lib widget captures a typed or drawn signature with an audit-payload emit. The widget is sufficient for evidentiary signatures (user intent + capture metadata) without pulling in cryptographic e-sign infrastructure.

## What

New `src/components/CnSignatureCapture/CnSignatureCapture.vue` (~440 LOC). Two capture modes — typed (text input rendered in a signature font) and drawn (`<canvas>` with mouse + touch handlers) — togglable via a radio when both `allowTyped` and `allowDrawn` are set. Optional affirmation checkbox. Emits `change` on every mutation with `{mode, value, affirmed, audit}`; `audit` carries an ISO timestamp + capture metadata.

## Non-goals

- Cryptographic / PKI signing — use an external e-sign service.
- Pressure / velocity biometrics — out of scope for evidentiary capture.

## Consumer impact

Refs [#282](https://github.com/ConductionNL/nextcloud-vue/issues/282). Unblocks scholiq `SignPlanModal` (drop the widget into a `CnWizardDialog` step). Available for opencatalogi / decidesk future sign-off flows.

## References

- [scholiq#131](https://github.com/ConductionNL/scholiq/pull/131).
- `CnWizardDialog` (#281 / PR #300) — typical host.
