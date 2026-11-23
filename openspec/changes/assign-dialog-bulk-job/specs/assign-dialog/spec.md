# assign-dialog-bulk-job Delta: assign-dialog

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [assign-dialog-bulk-job](../../)

## Purpose

Hand a selection of records to one handler from the bulk band, with the access check and the record of why done by OpenRegister.

## ADDED Requirements

### Requirement: An assign dialog can hand a selection over as a bulk job

When CnAssignDialog is opened with `selectedIds` and its config has `bulkJob: { register, schema, property? }`, confirming SHALL start OpenRegister's `openregister:assign` job: `POST /apps/openregister/api/bulk-jobs` with the selection as `{ ids }`, the parameters `{ property, value }` (the property defaults to `assignee.field`, else `assignee`; the value is the picked id), the note as the justification, and the numeric register and schema ids (a slug is read through `/api/registers/{slug}` and `/api/schemas/{slug}?register=`). The dialog SHALL then show the rehearsed job in CnBulkJobProgress, where the user applies it, and SHALL refresh the page when the job finishes. Whether the user may change each record is OpenRegister's check, made on the server before it writes; a refusal of the whole job SHALL be shown in the server's words and the dialog SHALL stay open.

#### Scenario: Three tickets go to one handler

- **GIVEN** the tickets list with three tickets selected and the bulk action "Assign to" opening CnAssignDialog with `bulkJob: { register: "pipelinq", schema: "ticket" }` and `assignee.field: "assignee"`
- **WHEN** the user picks Fatma Yildiz, writes why and confirms
- **THEN** the dialog posts `{ action: "openregister:assign", parameters: { property: "assignee", value: "fatma" }, selection: { ids: [the three] }, justification, register: 4, schema: 21 }` and shows the rehearsed job with its apply button

#### Scenario: The job is refused

- **GIVEN** the same dialog
- **WHEN** OpenRegister answers 422 "The selection is larger than this instance allows."
- **THEN** the dialog shows that sentence and stays open on the form
