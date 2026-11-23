## ADDED Requirements

### Requirement: A chart shows the categories a host marks as selected

A CnChartWidget SHALL show each category whose raw key is in `selected` as selected: a bar-list row with a ring in
`--color-main-text`, a bold label and, when the row is pickable, `aria-pressed="true"`; a bar or a pie or donut slice
with an outline in `--color-main-text` (`Highlight` under forced colours), drawn by the rules in the chart's shadow root
and put back after every redraw. A category that leaves `selected` SHALL lose its mark. On a `selectable` chart
ApexCharts' own click state SHALL be off, so the host's `selected` is the only selection shown. The folded "Other"
bucket SHALL never show as selected.

#### Scenario: the host echoes a pick
- **GIVEN** a selectable bar-list over `groupBy: "gemeenteCode"` with `selected: ["GM0344"]`
- **WHEN** the chart renders
- **THEN** the GM0344 row is ringed and pressed, and the other rows are not

#### Scenario: another chart's pick clears the mark
- **GIVEN** a selectable bar chart showing GM0355 as selected
- **WHEN** the host sets `selected` to `[]`
- **THEN** no bar of the chart carries the selection outline
