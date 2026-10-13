# store-page Delta: screens-store-page-board-header

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-store-page-board-header](../../)

## Purpose

The store page's header lines up with its content, as on the board.

## ADDED Requirements

### Requirement: The store header sits flush under the board look

Under the board look, with the navigation open, the store page SHALL take the board frame's padding, and its title,
description and controls SHALL start at the same left edge. While the navigation is closed the header SHALL keep the
56px inset that clears the navigation toggle. The Nextcloud look SHALL render as before.

#### Scenario: Navigation open

- **GIVEN** the store page under the board look with the navigation open
- **WHEN** it renders
- **THEN** the title, the description and the search row start 28px from the page's left edge
