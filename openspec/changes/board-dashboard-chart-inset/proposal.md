# Proposal: board-dashboard-chart-inset

## Why

On a board dashboard an HTML chart (bar list, matrix) takes the card's 24px side inset, but an ApexCharts plot did not:
it was drawn from the card's edge (COMPDIFF r19 DqDoorlooptijd "Gemiddelde doorlooptijd per maand": content inset 23 >
1). Its footnote had no inset either.

## What changes

In the board look a dashboard card's ApexCharts canvas is padded 4px 24px 20px, like an HTML chart; ApexCharts sizes
the plot to the box minus its padding. A footnote under the plot takes the side inset and the bottom 20px, at 13px.
