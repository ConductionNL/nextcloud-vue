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

### Requirement: Select all matching hands the query to the bulk job

When every row of the visible page is selected and the list's total is
larger than the page, `CnIndexPage` SHALL offer "Select all N matching" in
the selection strip, N being the list's `total`. Choosing it SHALL turn the
selection into a query selection: the strip SHALL read "All N matching
selected" with a way back to the page selection, and every bulk job the
strip creates SHALL send `selection: {query: <the page's current list query>}`
instead of `selection: {ids: [...]}`. The query SHALL carry the page's
filters, search, quick filter and sort exactly as the list request does, and
no paging keys. A refusal naming the instance ceiling SHALL be shown in the
dialog with the ceiling and the count. Changing a filter, the search or the
quick filter SHALL drop back to an empty selection.

#### Scenario: Export all 260 matching

- **GIVEN** a filtered list with total 260 and a page size of 25, all 25 rows selected
- **WHEN** the user chooses Select all 260 matching and runs a bulk action
- **THEN** `POST /api/bulk-jobs` SHALL carry `selection.query` with the page's filters and no `limit`, `offset` or `page`
- **AND** SHALL NOT carry `selection.ids`

#### Scenario: Above the ceiling

- **GIVEN** a query selection of 4,000 and an instance ceiling of 1,000
- **WHEN** the job creation is refused naming the ceiling
- **THEN** the dialog SHALL show the ceiling and the count, and nothing SHALL be written

#### Scenario: A filter change resets the selection

- **GIVEN** a query selection of all 260 matching
- **WHEN** the user changes a filter
- **THEN** the selection SHALL be empty and the strip SHALL be hidden

#### Scenario: One page, no offer

- **GIVEN** a list whose total fits on the visible page
- **WHEN** the user selects every row
- **THEN** no Select all matching offer SHALL appear

