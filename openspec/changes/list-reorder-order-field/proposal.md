# Proposal: a list reordered by its own order field

## Why

dossiq's case type orders its statuses by `order`. The legacy tab wrote the full object of every row on a drop, so each reorder dropped the keys its form did not know: `capacity`, `phaseTermDays` and `phaseTermShare`. No library list could reorder records by a field of their own, nor keep that field unique.

## What changes

- `CnObjectListWidget` gains `content.reorder: { field }`.
  - The list reads in that order.
  - The reader drags a row, or uses the Move up and Move down row actions.
  - The rows are renumbered, and only that field is PATCHed, only on the rows that changed.
  - The new place, or the server's refusal, is read out in a live region.
  - A new row starts last.
- `CnDataTable` gains `reorderable` and the `row-move` event.
- A form field override `unique` (`true` or `{ filter }`) refuses, on save, a value another object already has among the objects the filter matches.
- Manifest schema 2.133.0 documents `unique`.

## Depends on

This builds on `forms-save-edited-keys` and on `sub-objects-editor`, which are merged into the branch.
