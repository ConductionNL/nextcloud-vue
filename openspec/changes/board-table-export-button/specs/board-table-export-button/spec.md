# board-table-export-button Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-table-export-button](../../)

## Purpose

A table's export button looks as the boards draw it.

## ADDED Requirements

### Requirement: A board table export button is a neutral 40px control

In the board look the export button of a widget object table SHALL draw 40px tall with the control border, the main
background and the main text at 14px/600, also under a theme that gives tertiary buttons its own ink. Outside the
board look the button SHALL stay Nextcloud's tertiary button.

#### Scenario: DqTermijnen

- **GIVEN** the deadline dashboard in the board look with a report loaded
- **THEN** "CSV exporteren" draws 40px tall, white, with a 1px grey border and dark text
