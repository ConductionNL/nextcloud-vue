# Proposal: board-record-card-select-in-head

## Why

On DqZakenSorteren each case card heads with its selection checkbox on the left and the status pill on the right, on
one row. Live drew the checkbox on a row of its own above the card, then the pill and the row menu on the next row,
the pill on the left (r25: the cards view 316 components against 13, each card a row taller).

## What changes

In the board look a selectable card with a record layout draws its checkbox at the start of the head row, and the head
pill moves to the end of that row, before the row menu. A card without a record layout, or without selection, is
unchanged. No schema change.
