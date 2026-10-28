# A data widget can keep its columns in the board look

## Why
Board PqLead draws the Deal card's eight facts in two columns. The board look fits 200px columns, so the card showed three.

## What changes
With `content.fixedColumns: true`, a data widget keeps `columns` in the board look as well. Without it, nothing changes.
