# dashboard-grid Delta: dashboard-growth-keeps-order

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [dashboard-growth-keeps-order](../../)

## Purpose

A size-to-content card that grows pushes the cards under it down in their order.

## ADDED Requirements

### Requirement: A growing cell keeps the order of the cards under it

When a size-to-content cell grows after the grid is built, every card that the growth would overlap SHALL move down by the growth, and so SHALL every card that such a move would overlap, before the cell grows. Cards beside the cell SHALL keep their place. The order of the cards from top to bottom SHALL stay as authored, whether the grid packs (`float: false`) or not. This order SHALL hold for a cell that grows while the grid is built and for one that grows later; while the grid is built it SHALL be kept by rendering, and so adding, the items top to bottom, then left to right. A cell that shrinks SHALL behave as before.

#### Scenario: pipelinq's simple dashboard at 1100 wide

- **GIVEN** a full-width size-to-content banner over four stat tiles, a full-width card under the tiles, and two lists under that card
- **WHEN** the banner's text wraps and the banner grows from two rows to three
- **THEN** the tiles, the full-width card and the lists each move down one row
- **AND** the full-width card stays above the lists
