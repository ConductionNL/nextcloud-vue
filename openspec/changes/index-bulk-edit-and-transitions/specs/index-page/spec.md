# index-page Delta: index-bulk-edit-and-transitions

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [index-bulk-edit-and-transitions](../../)

## Purpose

The selection strip of `CnIndexPage` changes one field, or runs one
lifecycle step, on every selected row as one previewed OpenRegister bulk
job. Rows `pub-bulk` (opencatalogi matrix) and `data-bulk-edit` (buildiq
matrix).

## ADDED Requirements

### Requirement: The selection strip changes one field on every selected row

When a page declares `config.bulkEdit.fields`, `CnIndexPage` SHALL offer
a Change a field action in the selection strip. The action SHALL open a
dialog listing only the declared fields, SHALL render the chosen field
with the widget `CnFormDialog` uses for that property, and SHALL send one
value for all selected rows. An empty input SHALL NOT be sent unless the
user chose to clear the field. A page without `bulkEdit` SHALL NOT show
the action.

#### Scenario: A clerk moves forty publications to a new theme

- GIVEN the Publications page declares `bulkEdit.fields: ["theme"]`
- AND a clerk has selected 40 publications
- WHEN she chooses Change a field, picks Theme, selects "Wonen" and confirms the preview
- THEN all 40 publications carry the theme "Wonen"
- AND the outcome panel reports 40 applied

#### Scenario: An undeclared field is not offered

- GIVEN a page declaring `bulkEdit.fields: ["status"]`
- WHEN the user opens Change a field
- THEN only Status is offered

#### Scenario: A page that did not ask shows nothing new

- GIVEN a page without `bulkEdit` and without `bulkTransitions`
- WHEN rows are selected
- THEN the strip shows the same actions as before this change

### Requirement: The selection strip runs one lifecycle step on every selected row

When a page declares `config.bulkTransitions: true`, `CnIndexPage` SHALL
offer a Run a step action listing the lifecycle actions OpenRegister
reports as available on at least one selected row, each with the number
of selected rows that allow it. A row on which the action is absent or
blocked SHALL be reported as skipped with OpenRegister's description,
never as applied.

#### Scenario: A clerk withdraws a mixed selection

- GIVEN 12 selected publications, 10 published and 2 already withdrawn
- WHEN the clerk chooses Run a step and picks Withdraw
- THEN the preview says 10 will be withdrawn and 2 are skipped, naming the reason
- AND after confirming, the 10 are withdrawn and the 2 are unchanged

### Requirement: A bulk act is previewed and committed as one OpenRegister job

Both actions SHALL create an OpenRegister bulk job
(`POST /apps/openregister/api/bulk-jobs`) with the selection and the
parameters, SHALL show the preview counts and reasons before anything is
written, and SHALL write only after the user commits. The library SHALL
NOT loop per-row saves or transitions in the browser for these actions.
An action whose id `GET /apps/openregister/api/bulk-actions` does not
list SHALL NOT be offered.

#### Scenario: Nothing is written before the commit

- GIVEN a clerk who opened Change a field on 5 rows and saw the preview
- WHEN she closes the dialog without committing
- THEN none of the 5 rows has changed

#### Scenario: An instance without the action hides it

- GIVEN an OpenRegister whose `/api/bulk-actions` does not list `set-field`
- AND a page declaring `bulkEdit.fields`
- WHEN rows are selected
- THEN Change a field is not shown

### Requirement: One outcome panel renders every bulk job

`CnBulkJobOutcome` SHALL render a bulk job envelope with its applied,
skipped and refused counts, progress while the job runs, and the per-row
outcome with its reason and a link to the row. A row refused for access
SHALL show as refused, not as skipped.

#### Scenario: A refused row is named

- GIVEN a committed job in which one row was refused because the user may not write it
- WHEN the outcome panel renders
- THEN that row is listed as refused with the server's reason and a link to it
