# board-stat-tile-inset Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-stat-tile-inset](../../)

## Purpose

A board stat tile on a dashboard page sits on the board's inset and has the board's line heights, wherever the
dashboard places it.

## ADDED Requirements

### Requirement: A board stat tile in a card-fit cell sits on the board's inset

In the board look a stacked board stat tile in a dashboard card-fit cell SHALL carry only its own 18px 20px padding:
the cell SHALL add no padding and the tile SHALL draw no border of its own, in the KPI row and in the grid alike.

#### Scenario: DqTermijnen and DqMijnWerk tiles

- **GIVEN** a dashboard page in the board look with stat tiles in the KPI row and in the grid
- **THEN** each tile's label starts 21px from the card's left edge (its 1px border and 20px padding)

### Requirement: A board stat tile's label and caption are set at the normal line height

A board stat tile's label and caption SHALL be set at `line-height: normal`.

#### Scenario: DqTermijnen label

- **GIVEN** a board stat tile
- **THEN** its label's first line starts at the tile's top padding, without Nextcloud's half-leading above it
