# Proposal: data-matrix-weights

## Why

Board DqAanbesteding draws a "Beoordelingsmatrix": bidders against award criteria, each criterion with its weight in
the header ("Prijs 40%"), the price under each bidder's name, a weighted total and a rank, with the leading bidder
tinted. CnDataMatrix drew the grid and plain row sums, without weights or a rank.

## What changes

- A column takes `weight` and an optional `weightLabel`, shown beside its label.
- `rowTotalsMode: "weighted"` makes the row total the weighted mean of the row's scores.
- `showRank` adds a rank column, `highlightTopRank` tints the leading row, `rankLabel` names the column.
- `rowSublabelKey` draws a second line under each row label; `totalsFractionDigits` rounds the totals.
- Row headers get `scope="row"`.
- Without the new props nothing changes.

Covers gap 23 of the dossiq component-gap audit (decision 281).
