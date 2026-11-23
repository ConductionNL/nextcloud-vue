# Proposal: choice-matrix

## Why

Board DqZaaktypeVelden shows "Wie wat ziet en invult, per rol en status": field rows against role-and-status columns, each
cell hidden, required or read only. `CnDataMatrix` edits free values and `CnActionAuthMatrix` edits ticks against
Nextcloud groups. Neither holds one choice per cell out of a closed set.

## What changes

- New `CnChoiceMatrix`: `rows`, `columns`, `choices`, and a `modelValue` map of row id to column key to choice value.
- A cell with nothing stored shows `defaultValue`. A row, a column or the whole matrix can be read only.
- A change emits the whole new map (`update:modelValue`) and the changed cell (`cell-change`).

Covers gap 9 of the dossiq component-gap audit (decisions 281 and 297).
