# Proposal: chart-bar-list-and-matrix

## Why

Boards DqDashboard and DqMijnTeam ("Zaken per status", "Zaken per type"), DqTermijnen and DqDoorlooptijd ("per
zaaktype") draw a bar list: per row a label, a horizontal track and the value, rows clickable to drill down, and a
footnote. Board DqProcesanalyse ("Dagen per fase") draws a matrix: case types as rows, phases as columns, each cell
tinted by its value. The chart widget only had ApexCharts kinds; a horizontal bar chart draws axes and a grid instead.

## What changes

- CnChartWidget takes `type` (manifest `chartKind`) `bar-list` and `matrix`, drawn as plain rows over the same data
  sources (static series, `dataSource`, `endpointSource`).
- New props `barMax` and `footnote`; `valueFormat` gains `number` with a `suffix`.
- `endpointSource` gains `rowsPath`, `rowLabelPath` and `rowValuesPath` for a payload with one row per series.
- Manifest schema 2.106.0 types the new keys.
