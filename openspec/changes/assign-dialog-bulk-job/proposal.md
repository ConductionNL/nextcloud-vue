---
kind: code
---

# Proposal: assign-dialog-bulk-job

## Summary

Board PqTicketsSelectie draws "Toewijzen aan" in the bulk band: the selected tickets go to one handler. dossiq does this with its own ReassignSelectionDialog and its own bulk action class. OpenRegister already ships the generic one, `openregister:assign`, which writes one property on every selected object, checks the update rule of each object's schema for the user before it writes, refuses the rows the user may not change, and records the reason on every row.

CnAssignDialog learns to start that job. A bulk action opens the dialog with the selection (`handler: "open-modal"`, `target: "CnAssignDialog"`), `config.bulkJob` names the register, the schema and the property, and the dialog rehearses the job and shows CnBulkJobProgress, where the user reads what would happen and applies it. No app writes a loop or an endpoint for it.

## Scope

- `src/components/CnAssignDialog/CnAssignDialog.vue`: `selectedIds` and `count` props, `config.bulkJob`, the job in CnBulkJobProgress.
- No schema change: the config travels in the bulk action's `props`.
