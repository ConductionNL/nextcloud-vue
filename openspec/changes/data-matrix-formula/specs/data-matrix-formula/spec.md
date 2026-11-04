# data-matrix-formula Delta: data-matrix-formula

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [data-matrix-formula](../../)

## Purpose

A user types numbers in a matrix and sees what follows from them.

## ADDED Requirements

### Requirement: A column computes its cells

A column with `formula` SHALL compute each cell through `evalFormula` from the row's numbers by column key, the row above as `prev_<key>`, and formula columns to its left. An empty cell SHALL NOT count as zero. `round` SHALL round the answer with `round`, `ceil` or `floor`. The cell SHALL be read only. Where the formula has no answer the cell SHALL show what the row holds under that key. Row totals, column totals, weights and ranks SHALL use the computed value.

#### Scenario: Board LqPrognose, the expected number

- **GIVEN** a row above with 200 learners and 90 percent going up, and this row with 180 learners and 10 percent staying
- **AND** the formula `prev_now*prev_over/100+now*stays/100`
- **THEN** the cell reads 198

#### Scenario: The first row

- **GIVEN** the first row, with `expected` 210 stored
- **THEN** the cell reads 210, because there is no row above

#### Scenario: Board LqPrognose, groups needed

- **GIVEN** 104 learners, 32 per group, and `round` `ceil`
- **THEN** the cell reads 4

#### Scenario: A number changes

- **WHEN** the host passes rows with a new percentage
- **THEN** the computed cell follows
