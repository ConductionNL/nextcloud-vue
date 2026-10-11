# narrow-object-table-widgets Delta

## Purpose

Keep a narrow object-table tile readable: its trailing columns stay visible,
and the sentence of an empty tile is read in full.

## ADDED Requirements

### Requirement: A narrow object table keeps its trailing columns in view

`CnDataTable` with `fitWidth` SHALL be no wider than its container. One column
SHALL take the width that is left and SHALL cut its text with an ellipsis; that
column is the first with `grow: true`, else the column keyed `title`, else
`name`, else the first column. Every other column SHALL keep its content on one
line at its own width. `CnWidgetObjectTable` SHALL turn `fitWidth` on unless it
is given `fitWidth: false`. Without `fitWidth` the table SHALL lay out as
before.

#### Scenario: The recently opened tile in a 342px tile

- **GIVEN** a `CnWidgetObjectTable` with columns identifier, title and a date, a long title, in a 342px tile
- **WHEN** it renders
- **THEN** the table is no wider than the tile and every date cell ends inside it
- **AND** the title cell ends in an ellipsis while the identifier and the date are not cut
- @e2e `e2e/narrow-object-table.e2e.js`

#### Scenario: A column asks to grow

- **GIVEN** a table with `fitWidth` and a column with `grow: true`
- **WHEN** it renders
- **THEN** that column, and no other, carries the grow class
- @e2e exclude class selection is covered by `tests/components/CnDataTableFitWidth.spec.js`; the layout it drives is the scenario above

### Requirement: The empty text of a table wraps

The empty row of `CnDataTable` SHALL wrap its text, whether it shows
`emptyText` or the reason a personal lens cannot answer, instead of cutting it
to one line.

#### Scenario: A long empty text in a narrow tile

- **GIVEN** an empty object-table tile of 342px whose empty text is a long sentence
- **WHEN** it renders
- **THEN** the text runs over more than one line and is not cut
- @e2e `e2e/narrow-object-table.e2e.js`
