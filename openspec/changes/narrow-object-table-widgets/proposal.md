---
kind: code
---

# Proposal: narrow-object-table-widgets

## Summary

On the review instance of 10 October 2026 (finding N1), dossiq's "Recently
opened" tile drew a 444px table in a 342px tile. The table is as wide as its
one-line cells, so the trailing date column was cut off. When the tile was
empty, the sentence saying why (the lens reason) was cut to one line with an
ellipsis, because the empty row inherits the one-line rule of a data cell.

## What changes

1. `CnDataTable` gains `fitWidth` (default `false`). The table fits its
   container: one column takes the room that is left and ends in an ellipsis,
   every other column keeps its content on one line at its own width. The
   column that grows is the first with `grow: true`, else `title`, else
   `name`, else the first column.
2. `CnWidgetObjectTable` gains `fitWidth`, default `true`, forwarded to the
   table. A tile that wants the auto layout passes `false`.
3. The empty row of every `CnDataTable` wraps its text (the empty text, or the
   lens reason) instead of cutting it to one line.

No change to `CnIndexPage` lists or other tables unless they opt in.
