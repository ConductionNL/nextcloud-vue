# chart-bar-list-and-matrix Delta: chart-bar-list-and-matrix

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [chart-bar-list-and-matrix](../../)

## Purpose

The chart widget can draw the boards' bar lists and matrices over its existing data sources.

## ADDED Requirements

### Requirement: A chart can draw a bar list

CnChartWidget SHALL take type `bar-list` (manifest `chartKind`). It SHALL draw one row per category of the first
series: the label, a track filled to the value's share of `barMax` (the largest value when unset, capped at 100%), and
the value through `valueFormat`. When the `dataSource` declares an actionable `drilldown`, each row SHALL be a button
that navigates as a bar click does. A `footnote` SHALL render under the rows.

#### Scenario: Board DqDashboard "Zaken per status"

- **GIVEN** a bar list with Ontvangen 14, In behandeling 19, Besluit 8
- **THEN** In behandeling fills its track and Besluit fills 42% of it
- **AND** each row shows its count at the end

#### Scenario: Board DqTermijnen percentages

- **GIVEN** a bar list with `barMax: 100` and `valueFormat: "percent"` and Woo-verzoek 88
- **THEN** the Woo-verzoek track is filled 88% and reads 88%

### Requirement: A chart can draw a matrix

CnChartWidget SHALL take type `matrix`. It SHALL draw a table with one row per series and one column per category, each
cell showing its value through `valueFormat` and tinted in four steps by its share of the largest value. An
`endpointSource` with `rowsPath` SHALL map one series per row (`rowLabelPath`, default `label`; `rowValuesPath`,
default `values`), the columns from `labelsPath`. A text cell SHALL show its text, tinted through `colorMap` (`success`,
`warning`, `error`, `danger` or a CSS colour). `highlight` `{ row, column, columnKeys? }`, with tokens resolved against the
record, SHALL outline the matching cell and mark it `aria-current`.

#### Scenario: Board DqProcesanalyse "Dagen per fase"

- **GIVEN** a matrix with case types as rows, phases as columns and `valueFormat: { name: "number", suffix: " d" }`
- **THEN** each cell reads its days ("9 d") and the largest value takes the darkest tint

#### Scenario: Board DqHandhaving enforcement matrix on a detail page

- **GIVEN** a text matrix with `colorMap` tones and `highlight: { row: "@object.behaviour", column: "@object.consequence" }`
- **AND** a record with behaviour 2 and consequence C
- **THEN** each cell is tinted by its measure and the cell in row 2, column C is outlined

### Requirement: Board dashboard card heads draw no divider

In the board look a dashboard card's header SHALL draw no rule under its title.

#### Scenario: Board DqDashboard

- **GIVEN** a dashboard in the board look
- **THEN** no card draws a line between its title and its content

