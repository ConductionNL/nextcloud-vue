# record-list-table Delta: record-list-table

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [record-list-table](../../)

## Purpose

A record list can draw its rows as a small table with a header, as board DqTeamwachtrij draws the work per case type.

## ADDED Requirements

### Requirement: A record list can draw its rows as a small table

With `presentation: "table"` the record list SHALL draw a header row with each `columns` entry's translated `label`,
and one row per record with one cell per column, filled from the column's `value` template. A column with
`align: "end"` SHALL be right-aligned. A cell whose number is above the column's `alertAbove` SHALL read bold in the
danger colour. A `footnote` SHALL be drawn, translated, under the list in any presentation.

#### Scenario: Board DqTeamwachtrij

- **GIVEN** columns Zaaktype `{title}`, Open `{open}` and Wacht `{waiting}` with `align: "end"` and `alertAbove: 0`
  on Wacht, and a footnote
- **THEN** a row with 4 waiting cases reads its Wacht cell in bold red, a row with 0 waiting in the plain colour, and
  the footnote stands under the table
