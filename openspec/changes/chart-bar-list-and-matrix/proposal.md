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
- A matrix holds text cells tinted by `colorMap`, and `highlight` outlines the record's cell (board DqHandhaving).
- In the board look dashboard card heads draw no divider.
- The manifest schema types the new keys (version given at merge).
