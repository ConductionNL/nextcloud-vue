# dashboard-tile-text-fits Delta

## Purpose

The text of a narrow dashboard tile is read in full, as the DqDashboard board
shows it: a KPI caption and label wrap instead of being cut, and a case number
sits under its title instead of running out of the tile.

## ADDED Requirements

### Requirement: A KPI tile's caption and board label wrap to two lines

The caption line of a stacked KPI tile (`cn-kpi-card__caption-line`, used by
the caption and the note of `CnStatWidget` with `layout: "stacked"`) SHALL wrap
onto at most two lines instead of being cut to one line. In the board look the
label of a `CnStatWidget` tile (`cn-kpi-card__title-text`) SHALL wrap onto at
most two lines as well, and an icon badge beside it SHALL keep its size. Text
longer than two lines SHALL end in an ellipsis. The value SHALL still never
wrap.

#### Scenario: A long caption and label in a narrow board tile

- **GIVEN** a board-look `CnStatWidget` tile with `layout: "stacked"`, `iconPlacement: "end"`, the label "Afgehandeld deze maand" and the caption "haalden hun termijn, naar doorlooptijd", 190px wide
- **WHEN** it renders
- **THEN** the caption is not cut and runs over two lines
- **AND** the label is not cut and the badge keeps its 32px
- @e2e `e2e/dashboard-tile-text-fits.e2e.js`

#### Scenario: Without the board look the label keeps one line

- **GIVEN** the same tile without the board look
- **WHEN** it renders
- **THEN** the label stays on one line
- @e2e `e2e/dashboard-tile-text-fits.e2e.js`

### Requirement: The secondary line of a narrow table's growing column sits under the value

In a `CnDataTable` with `fitWidth`, the secondary line of the column that
grows (`columns[].secondary`, `cn-table-cell__secondary`) SHALL sit on a line
of its own under the value and SHALL end in its own ellipsis when it does not
fit, in the default and in the board look. In the board look the underline of
the title SHALL NOT reach it.

#### Scenario: The recently opened tile with a case number under the title

- **GIVEN** a board-look `CnWidgetObjectTable` of 342px whose title column has `secondary: "identifier"` and a long title
- **WHEN** it renders
- **THEN** the case number starts below the title, inside the title cell, and is not underlined
- @e2e `e2e/narrow-object-table.e2e.js`
