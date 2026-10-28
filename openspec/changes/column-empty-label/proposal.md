# A column's empty label

## Why
An empty cell reads as a dash. Some columns mean something by an empty value: DqTenant's "Besluiten tot" is "Onbeperkt" for a role without a ceiling. dossiq configured `emptyLabel`, which no code read.

## What changes
CnDataTable reads a column's `emptyLabel`: an empty cell (null, undefined or '') shows those words, translated, as plain text past the column's format and widget. `emptyValueBy` and `emptyValue` go first. CnObjectListWidget passes the key through. No schema change (column keys are free-form here).
