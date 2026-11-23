# stat-tile-board-look Delta: board-stat-tile-grows

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-stat-tile-grows](../../)

## Purpose

A board stat tile whose label wraps shows every line instead of clipping.

## ADDED Requirements

### Requirement: A board stat tile shows all its lines

Under the board look a stacked stat tile SHALL be at least as tall as its cell's content box and otherwise as tall as its content, so a tile whose label wraps SHALL NOT clip its label, its number or its caption. A tile that fits SHALL keep the cell's height.

#### Scenario: Afgehandeld deze maand at 1100 wide

- **GIVEN** a stacked board tile "Afgehandeld deze maand" with caption "september: 0" in a 162 x 118px card-fit cell
- **WHEN** its label wraps to two lines
- **THEN** the label, the number and the caption show inside the cell and the tile clips nothing
