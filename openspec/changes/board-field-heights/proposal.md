# Proposal: board-field-heights

## Why

The boards draw the index side panel's fields 40px tall (DqZakenSorteren "Sorteren op" and its search field) and a
dashboard's page filters 36px (DqProcesanalyse and DqDoorlooptijd "Filteren op zaaktype", "Periode"). NcInputField,
which is also NcSelect's search box, draws 30px in a 34px wrapper. COMPDIFF r21: `h 40>30` and `h 36>30` on 6 fields.

## What changes

In the board look the index side panel sets `--cn-field-height: 40px` and a dashboard page filter `36px`; in both the
field wrapper is the height plus the 2px focus ring and the input the height, as on the board forms and settings cards.
A multiple select's search box sits beside its chips and keeps its own height.

## Scope

Board-only, `look-board.css` and `look-board-index.css`. The field edge is a separate change (board-field-edge).
