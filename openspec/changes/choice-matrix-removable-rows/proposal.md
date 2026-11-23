# Proposal: choice-matrix-removable-rows

## Why

Board PqIntakeFormulier maps fixed questions to fields: a select per row, and an error on a row whose question is gone from the form. The user removes that row.
`CnChoiceMatrix` (with `rowErrors` from choice-matrix-pick-per-row) shows the error but offers no way to remove the row.

## What changes

- `CnChoiceMatrix` gets `removableRows`, a row's `removable: false`, and the event `remove-row`.
- Remove emits the map without the row, announces the removal and keeps the focus in the grid.
- Without `removableRows` the matrix behaves as before.

Builds on choice-matrix and choice-matrix-pick-per-row. Pipelinq row of the fleet component gap list (decisions 281, 320).
