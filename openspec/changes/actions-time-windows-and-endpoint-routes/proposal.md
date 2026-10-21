---
kind: code
---

# Proposal: actions-time-windows-and-endpoint-routes

## Summary

pipelinq's booking, cash-shift, refund and POS-transaction headers are bespoke components because four small things were
missing from declared header actions:

- **A time window.** "Send reminder" shows only while a booking starts more than an hour from now. `@now` could not be
  shifted; `@now±N(m|h|d)` now can (`{ "field": "startAt", "op": "gt", "value": "@now+1h" }`).
- **Follow the answer.** Rescheduling makes a new booking. An `open-form` with an `endpoint` now follows `onSuccessRoute`
  like a schema form does, reading the id at `onSuccessRoute.idPath` of the answer.
- **A required field.** An endpoint form could not require a field (a counted amount, a reason). `required: true` on a
  `formProperties` entry now does.
- **Admin only as a button.** `adminOnly` hid an action in the menu, but the same action named as the stage's primary
  button or a quick action was drawn for everyone. Those buttons now follow `adminOnly` too.

## Scope

- `src/utils/sentinelTokens.js`, `src/utils/resolveFilterTokens.js`: the `@now±N(m|h|d)` token.
- `src/components/CnActionButtons/CnActionButtons.vue`, `src/utils/actionsDispatcher.js`: endpoint-form `required` and
  `onSuccessRoute` with `idPath`.
- `src/components/CnDetailPage/CnDetailPage.vue`: primary and quick buttons honour `adminOnly`.
- `src/schemas/app-manifest-v2.schema.json`: 2.140.0 (the token, `idPath`, the `required` note). The integrator renumbers.
- Docs: sentinel vocabulary, CnActionButtons, CnDetailPage.
