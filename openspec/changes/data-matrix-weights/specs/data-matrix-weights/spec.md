# data-matrix-weights Delta: data-matrix-weights

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [data-matrix-weights](../../)

## Purpose

CnDataMatrix can draw a scoring matrix: weighted columns, a weighted total per row and a rank.

## ADDED Requirements

### Requirement: A matrix can weigh its columns and rank its rows

A CnDataMatrix column SHALL take `weight` (a number) and `weightLabel`, and show `weightLabel`, else the weight, beside
its label. With `rowTotalsMode: "weighted"` the row total SHALL be the mean of the row's number cells weighted by their
column's `weight`, leaving out a cell without a value and a column without a positive weight; a row without any such
cell SHALL have no total. With `showRank` a rank column SHALL rank the rows by their total, highest first, rows with an
equal total sharing a rank; its header SHALL be `rankLabel`, by default the translated "Rank". `highlightTopRank` SHALL
tint the row ranked first. `rowSublabelKey` SHALL draw that field as a second line under the row label, and
`totalsFractionDigits` SHALL round the totals. Without these props the matrix SHALL read as before.

#### Scenario: Board DqAanbesteding "Beoordelingsmatrix"

- **GIVEN** the criteria Prijs 40%, Plan van aanpak 30%, Duurzaamheid 20% and Social return 10%
- **AND** Groenwerk Zuid B.V. scoring 8,6, 8,0, 7,5 and 9,0
- **WHEN** the matrix has `rowTotalsMode: "weighted"`, `totalsFractionDigits: 1`, `showRank` and `highlightTopRank`
- **THEN** its total reads 8,2
- **AND** it ranks 1 and its row is tinted

#### Scenario: Equal totals

- **GIVEN** two rows with the total 8 and one with 6
- **THEN** the two rank 1 and the third ranks 3
