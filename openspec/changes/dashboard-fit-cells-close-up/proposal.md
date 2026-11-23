---
kind: code
---

# Proposal: dashboard-fit-cells-close-up

## Summary

A size-to-content dashboard cell (`sizeToContent`) can only be a whole number of GridStack rows tall, and a row is 80px.
On a packing grid (`gridFloat: false`) the cell therefore kept up to a row of empty space under its content, and the
card below could not move into it: pipelinq and dossiq Mijn werk, decidiq Mijn acties.

In view mode, a packing grid that holds a size-to-content cell now draws each layout row as eight 10px GridStack rows.
Every place and size scales with the rows, so each widget keeps its pixel place and size until a cell shrinks; the cell
then ends within 10px of its content and the widgets below move up. The layout itself stays in layout rows: the manifest,
edit mode and `layout-change` never see the finer rows.

## Why this and not the alternatives

- A smaller `cellHeight` for everyone would change every app's layout (every `gridY` and `gridHeight` doubles or more).
- Rounding a cell's content up to a whole row is the cause, so no CSS on the cell closes the gap.
- The split is internal to CnDashboardGrid and needs no manifest change.

## Scope

- `src/components/CnDashboardGrid/CnDashboardGrid.vue`: `wantsRowSplit`, `rowSplit`, `scaledRow`, `rebuildGrid`.
- On split rows a size-to-content cell may shrink to one grid row (its content decides); the dashboard's
  `minHeight` (two rows) stays the minimum for every other cell and for resizing by hand in edit mode.
- Only grids with `float: false`, not editable, with a size-to-content cell. Every other grid is built exactly as before.
- In split rows the grid does not report packing or measuring as `layout-change` (it is never a user's arrangement).
  Before, a packing grid in view mode reported the measured heights, and CnDashboardPage wrote them into the page layout.
- A grid that does not pack (`gridFloat` true, the default) keeps its rows as before: a shrinking cell there keeps its
  rows by design. An app that wants the gap closed sets `gridFloat: false`, as pipelinq and dossiq do.
