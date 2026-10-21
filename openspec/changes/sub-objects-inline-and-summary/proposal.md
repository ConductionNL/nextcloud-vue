---
kind: code
---

# Proposal: sub-objects-inline-and-summary

## Summary

pipelinq edits a resource's working hours and vacations, and a service's steps, with its own row editors because
CnSubObjectsField could not:

- edit two to four short cells in the row itself, without a dialog per row (`inline`);
- show a line that adds the rows up against the parent object, "45 of 60 min" (`summary`);
- refuse a row that breaks a rule between its own fields, "open time must be before close time" (`rowRules`).

CnSubObjectsField grows those three props, CnFormDialog passes them from a field override (and the form data as
`parentData`) and blocks the save on a broken rule, and `visibleWhen` compares two clock times as times of the day.

## Scope

- `src/components/CnSubObjectsField/CnSubObjectsField.vue`, `src/components/CnFormDialog/CnFormDialog.vue`,
  `src/utils/visibleWhen.js`, `docs/components/cn-sub-objects-field.md`.
- No manifest schema change: a field override takes free-form keys.
