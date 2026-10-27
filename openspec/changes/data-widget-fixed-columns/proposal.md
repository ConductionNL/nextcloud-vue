---
kind: code
screens: [PqAfspraak]
---

## Why

The board look fits a data card into as many 200px columns as it has room for, ignoring `columns` (except 1). Board
PqAfspraak draws "Afspraakgegevens" as two columns read row by row, so live laid the same fields out in three.

## What changes

`content.fixedColumns: true` keeps `columns` under the board look as `repeat(n, minmax(0, 1fr))`. Without it nothing
changes.
