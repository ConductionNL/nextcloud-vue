---
kind: code
---

# Proposal: form-widgets-duration-and-subobject-table

## Summary

Two form widgets for `CnFormDialog` and `CnFormPage`. A `duration` widget
reads and writes an ISO 8601 duration as a number plus a unit, so an admin
types "56 days" instead of `P56D`. A `sub-objects` widget renders an array of
objects as an editable table with add, edit, reorder and remove, so a case
type's statuses, results and checklist items are rows, not a JSON text box.

Opened from the dossiq competitor analysis, round 2, placement section 3
(`concurrentie-analyse/procest/_round2/compare/placement.md`) for findings
A10, A11 and A20, and defect triage #7
(`concurrentie-analyse/procest/_round2/compare/dossiq-defect-triage.md`).
Decision D10 (Ruben, 2026-09-08): proposal now, implementation separate.

## Motivation

dossiq's case type edit is one 27-field form with ISO durations typed by hand
and "JSON-encoded array" boxes for steps and transitions (triage #7,
`_round2/dossiq-baseline/pages/CaseTypeDetail.md`). nextcloud-vue 2.40 ships
no `duration` widget and no array-of-objects editor; the only array editors
are tags, multiselect and raw `json`. The competitors edit these as lists:

- Valtimo GZAC: statuses as rows with name, key, colour, default visibility
  and drag order (`valtimo/round2/pages/CaseDefinition-Statussen.md`);
  versions with a change note (`valtimo/round2/pages/CaseDefinition-Versiebeheer.md`).
- xxllnc Zaaksysteem: phases with names, terms and order in the case type
  editor (`xxllnc-zaken/round2/case-type-editor-anatomy.md`); a checklist
  dialog per milestone (`xxllnc-zaken/round2/pages/CaseTypeV1-milestones.md`).
- OpenCase: code lists as short editable tables
  (`opencase/round2/pages/Configuration-CodeLists.md`).

## Affected projects

- `nextcloud-vue`: `CnFormDialog`, `CnFormPage`, two widget components, the
  widget resolver, the `dialog-system` capability.
- Consumers: dossiq (case type, status type, checklist), hermiq, humaniq
  (leave rules carry durations), any schema with `format: duration` or an
  array of objects.

## Backward compatibility

Selection by schema is automatic only for `format: "duration"`. An array of
objects keeps the `json` widget unless the field override or the schema's
`x-widget` names `sub-objects`, because a large nested array may be better
served by the JSON editor.

## Theming

Table and inputs reuse `CnDataTable` and `NcTextField` styling.
