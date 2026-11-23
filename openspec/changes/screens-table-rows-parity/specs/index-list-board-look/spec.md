# index-list-board-look Delta: screens-table-rows-parity

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-table-rows-parity](../../)

## Purpose

The board table's title column and row menu as the PqTickets, PqLeads and
DqZaken boards draw them.

## ADDED Requirements

### Requirement: A row title can be plain text

CnDataTable and CnIndexPage SHALL take `rowTitle`, `link` (the default) or
`plain`, and an index page SHALL accept it as `config.rowTitle`. Under the
board look `plain` SHALL draw the title column's title as 15px weight 700
text in `--color-main-text` without an underline, with the column's secondary
line 2px under it at 13px in `--color-text-maxcontrast`. The row SHALL stay
clickable. `link` SHALL draw the title as before. The Nextcloud look SHALL
ignore the key.

#### Scenario: The ticket list draws a plain title

- **GIVEN** a ticket index page under the board look with `config.rowTitle: "plain"` and a title column with a secondary line
- **WHEN** it renders in a browser
- **THEN** "Afvalpas werkt niet bij de container" is bold 15px text without an underline, "PQ-2026-0409" sits under it in 13px muted text, and a click on the row opens the ticket

@e2e include Measure the title cell against pipelinq/PqTickets.

#### Scenario: A page without the key

- **GIVEN** an index page under the board look without `rowTitle`
- **WHEN** it renders
- **THEN** the title is underlined as before

### Requirement: The title link underlines the title only

Under the board look the title column's secondary lines (the column's
`secondary` line and the matched file line) SHALL NOT be underlined, also
when the title is.

#### Scenario: The case list

- **GIVEN** the case list under the board look with a title column whose secondary line is "2026-0061 · M. de Graaf"
- **WHEN** it renders in a browser
- **THEN** "Parkeervergunningen binnenstad" is underlined and "2026-0061 · M. de Graaf" is not

@e2e include Read the computed text decoration of the secondary line against dossiq/DqZaken.

### Requirement: The row menu keeps its board border under any theme

Under the board look the row menu button SHALL be a 34px square with a 1px
`--color-border-dark` border, radius 8px, no padding, on
`--color-main-background`, whatever a theme sets on secondary buttons
(border colour, padding, minimum width). It SHALL never take the
`--color-primary-element` border.

#### Scenario: The ticket list under the nldesign theme

- **GIVEN** the ticket list under the board look and the nldesign theme
- **WHEN** it renders in a browser
- **THEN** every row ends in a 34px by 34px menu button with a grey border and three dots

@e2e include Measure the row menu button against pipelinq/PqTickets with the nldesign theme on.
