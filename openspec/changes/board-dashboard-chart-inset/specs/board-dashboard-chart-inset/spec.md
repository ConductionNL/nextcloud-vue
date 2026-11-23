# board-dashboard-chart-inset Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-dashboard-chart-inset](../../)

## Purpose

An ApexCharts plot on a board dashboard card sits on the card's inset, as an HTML chart does.

## ADDED Requirements

### Requirement: A board dashboard plot keeps the card's inset

In the board look an ApexCharts plot on a bordered dashboard card SHALL be drawn inside the card's 24px side inset and
20px bottom inset; a footnote under the plot SHALL take the side inset and the bottom inset in the plot's place.

#### Scenario: DqDoorlooptijd monthly chart

- **GIVEN** a board dashboard card with a line chart and a footnote
- **THEN** the plot starts 25px from the card's left edge and fits the card's width, and the footnote sits under it
  on the same inset, 20px above the card's bottom
