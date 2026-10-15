# stat-tile-board-look Delta: stat-value-fits

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [stat-value-fits](../../)

## Purpose

A stat tile's number is never clipped by its tile.

## ADDED Requirements

### Requirement: A stat value shrinks instead of clipping

When a stat tile's numeric value is wider than its value row, the value's font SHALL step down until it fits, re-measured when the value or the row's size changes, and SHALL NOT go below 14px. At 14px a value that still does not fit SHALL wrap rather than be clipped. A value that fits SHALL keep its own size, and a text value SHALL keep its own wrapping.

#### Scenario: Pipeline value at 1100 wide

- **GIVEN** a stacked board stat tile in a 162px cell whose value is € 1,012,400
- **THEN** the whole value shows inside the tile at less than 28px
- **AND** a tile beside it whose value is 12 shows it at 28px
