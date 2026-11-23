# board-detail-stat-tile-inset Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-detail-stat-tile-inset](../../)

## Purpose

A board stat tile on a detail page sits on the inset the boards draw.

## ADDED Requirements

### Requirement: A board stat tile on a detail page body sits on the board's inset

In the board look, a stacked stat tile in a detail page's body grid or band SHALL draw its label 16px below the card's
top border and 18px in from its side, with no padding from the card cell and no border of its own.

#### Scenario: PqProduct "Op deals"

- **WHEN** a user opens a product
- **THEN** the "Op deals" label sits 17px below the tile's outer top edge and 19px in from its outer side
