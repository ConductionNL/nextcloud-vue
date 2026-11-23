---
kind: code
---

# Proposal: tasks-table-inline-cancel-summary-note

## Summary

Board DqZaakTaken draws Annuleren as a secondary button beside Afronden on every open row, and ends the table's summary with "de taken van de hele zaak, ook die van collega's". The task table kept Cancel in the row's menu and had a fixed summary.

## Scope

- `src/components/CnTasksWidget/CnTasksWidget.vue`, docs, `tests/components/CnTasksWidgetInlineCancel.spec.js`.

## Out of scope

- The app manifests that configure it; this is the library half.
