# Proposal: dashboard-grid-flush

## Why

GridStack insets every card by the grid margin (12px) on each side. In the board look the KPI row and the header start
at the page edge, so the grid's cards started 12px further right (x=305 against 293 on the dossiq and pipelinq boards)
and ended 12px short.

## What changes

- CnDashboardPage hands `gridMargin` to its stylesheet as `--cn-dashboard-grid-margin`.
- Under the board look the grid reaches out by that margin on both sides, so card edges line up with the page edge.

The Nextcloud look is unchanged.
