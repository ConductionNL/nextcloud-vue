# board-title-secondary-own-line Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-title-secondary-own-line](../../)

## Purpose

The second line under a table's title reads under the title, however the app draws the title.

## ADDED Requirements

### Requirement: The title column's secondary line sits under the title

In the board look, the secondary line of a table's title column SHALL start below the title, whether the title is drawn
by the cell renderer or by the app's `#column-title` slot, and the title's underline SHALL not reach it.

#### Scenario: A slotted title with an owner line

- **GIVEN** a board-look table whose app draws the title "Leads per bron" through `#column-title`
- **AND** the column declares `secondary: "owner"`
- **THEN** "Pieter de Vries" is drawn under "Leads per bron", not beside it
