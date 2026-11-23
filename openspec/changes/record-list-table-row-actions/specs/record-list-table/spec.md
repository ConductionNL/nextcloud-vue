# record-list-table Delta: record-list-table-row-actions

## ADDED Requirements

### Requirement: A table row can carry a second line and an actions menu

In the `table` presentation a column with `sub` SHALL draw that template, filled from the row, as a muted second line under the cell's text, and nothing when it fills empty. When `rowActions` is set, the table SHALL end with a column headed by the translated `rowActionsHeader` (default "Actions") whose cell holds the row's actions menu, named by `rowActionsLabel`, with the entries whose `visibleWhen` holds for that row. An `endpoint` entry SHALL be called with the row's `{field}` tokens filled in and the list read again, as in the `rows` presentation.

#### Scenario: Board OrArchivering

- **GIVEN** a table with column Lijst `{title}` and `sub` `{summary}`, and row actions Approve (`endpoint` `/api/archival/destruction-lists/{uuid}/approve`) and Reject, both visible when `status` is `in_review`
- **THEN** the Lijst cell reads the title with the summary under it, the last column is headed "Actions", a list in review offers Approve and Reject, a destroyed list has an empty actions cell, and choosing Approve posts to that list's approve url
