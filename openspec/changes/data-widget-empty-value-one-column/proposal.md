# Data widget: words for an empty value, and one column in the board look

## Why
DqZaakBetrokkenen "Zetels" (board, as amended in design-system #356) draws the seats as one column of pairs:
"Wacht op oppakken: Nee", "Doorgegeven aan: Niemand". r25b (24 Oct) drew dashes in three columns, for two reasons. The
board look always fits 200px columns whatever `columns` says, and an empty or false value has no words of its own.

## What changes
- `overrides[key].emptyValue`: translated words for a value that is empty or false.
- The board look keeps `columns: 1` as one column; any other value still fits 200px columns.
No schema change (overrides are free-form).
