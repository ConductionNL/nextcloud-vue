# Proposal: choice-matrix-sort-filter-pills

## Why

Board DqZaaktypeVelden draws the field rights per role and status as a read-only grid whose every head has a sort chevron
and a filter funnel, and whose every cell is a coloured pill. `CnChoiceMatrix` draws the grid but not the heads' controls
or the pills, so the screen keeps its own table.

## What changes

- `sortable`: a sort button in every head; the row column sorts by label, a column by the order of `choices`.
- `filterable`: a funnel in every head; a text filter on the row column, a tick per value on a column.
- `pills`: a read-only cell drawn as a `CnStatusBadge` in its choice's new `variant`.

Backward compatible: all three default to off, and without them the grid draws as before. Covers round 4 item 4
(CaseTypeFieldRightsWidget) of the build programme (decision 371).
