# An object list column can opt out of the head filter

## Why

DqZaaktypeVelden draws no funnel on "In de lijst". dossiq sets
`filterable: false` on that column, but CnObjectListWidget dropped
`filterable` (and `filterField`) when it copied a manifest column to the
table, so live still drew the funnel. It took 26px from the Veld column,
field names broke mid-word and the rows grew (r35: table width 849>831.6,
the matrix card 52px low).

## What changes

CnObjectListWidget passes a column's `filterable` and `filterField` to
CnDataTable, which already honours both.
