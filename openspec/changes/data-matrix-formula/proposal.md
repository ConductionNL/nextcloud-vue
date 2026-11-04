# Proposal: data-matrix-formula

## Why

Board LqPrognose draws "Verwachte leerlingen per leerjaar": per row typed percentages and a computed expected number, and "Groepen nodig per vak": learners divided by the group size, rounded up. `CnDataMatrix` has no computed cells, and learniq `EnrolmentForecastView` carries this as a local table.

## What changes

- A column gains `formula` and `round`. Its cells compute through `utils/evalFormula`, stay read only, and count in totals, weights and ranks.
- A formula reads the row by column key, the row above as `prev_<key>`, and formula columns to its left.
- Where a formula has no answer, the cell shows what the row itself holds.
- A matrix without formulas is unchanged.

Item 10 of the fleet component gap list (decisions 281, 320). Built on `data-matrix-weights`, because the row total changes there.
