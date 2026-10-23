# record-list-table-row-actions

## Why

Board `openregister/OrArchivering` draws the destruction lists as a table: Lijst (the list's title as a link, with "1.204 records · bewaartermijn verstreken" under it), Opgesteld door, Status (a pill) and Acties, a menu per row with Goedkeuren, Afwijzen and more. The record list's `table` presentation draws one line per cell and no actions, and only its `rows` presentation carries `rowActions`.

## What changes

- A `table` column can carry `sub`, a template drawn as a muted second line under the cell's text.
- `rowActions` works in the `table` presentation too: a last column headed "Actions" (or `rowActionsHeader`) holds each row's menu, with the same entries, `visibleWhen` and `endpoint` calls as in `rows`. A row without a visible action has an empty cell.

## Impact

`src/components/CnRecordListWidget/CnRecordListWidget.vue`, `docs/components/cn-record-list-widget.md`, `tests/components/CnRecordListWidgetTableActions.spec.js`. No schema change: `columns[].sub` and `rowActionsHeader` are read from the free `content` object.
