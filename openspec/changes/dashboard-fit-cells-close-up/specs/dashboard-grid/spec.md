# dashboard-grid Delta: dashboard-fit-cells-close-up

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [dashboard-fit-cells-close-up](../../)

## Purpose

A size-to-content card on a packing dashboard ends at its content, and the card below moves up to it.

## ADDED Requirements

### Requirement: A size-to-content cell ends at its content

In view mode, a dashboard grid with `float: false` that holds a size-to-content cell SHALL draw each layout row as eight
GridStack rows of an eighth of the cell height, with every item's row, height, minimum height and size-to-content row
maximum scaled by eight and a size-to-content cell's minimum height one such row, so a size-to-content cell ends within one such row of its content and the items below move up.
A cell that does not size to content SHALL keep its pixel place and size. The grid SHALL NOT report packing or measuring
in split rows as a layout change. Every other grid (editable, `float: true`, or without a size-to-content cell) SHALL be
built on whole layout rows as before, and entering edit mode SHALL rebuild the grid on whole rows.

#### Scenario: Mijn werk

- **GIVEN** a packing dashboard with a three-row size-to-content card holding about 110px of content over the card below it
- **WHEN** the dashboard is shown
- **THEN** the card is at most 10px taller than its content plus the grid margins
- **AND** the card below it starts directly under it
- **AND** the card beside it has the place and size it has on a grid that does not pack
