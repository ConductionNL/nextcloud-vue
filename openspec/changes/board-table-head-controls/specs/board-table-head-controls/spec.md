# board-table-head-controls Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-table-head-controls](../../)

## Purpose

A board table's header controls take the shape the boards draw.

## ADDED Requirements

### Requirement: Board table header controls take the board's shape

In the board look a table header's sort button SHALL have no corner radius and its filter button SHALL have a 4px
radius. Without the board look both SHALL keep the table's own radius.

#### Scenario: DqZaken header

- **GIVEN** the cases table in the board look
- **THEN** the "Zaak" sort control is square and "Filteren op Zaak" has a 4px radius

#### Scenario: Plain Nextcloud

- **GIVEN** a table without the board look
- **THEN** the header controls keep `var(--border-radius)`
