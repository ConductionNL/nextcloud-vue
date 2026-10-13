# chart-widget Delta: screens-chart-canvas-fits

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-chart-canvas-fits](../../)

## Purpose

A chart fits its box without a scrollbar.

## ADDED Requirements

### Requirement: A chart canvas does not scroll

The chart widget's canvas box SHALL NOT be a scroll region, and the drawn chart SHALL end inside the box.

#### Scenario: Three report charts

- **GIVEN** a bar, a line and a donut chart with a fixed height in a 518px card
- **WHEN** they render
- **THEN** no canvas box is a scroll region, none draws a scrollbar, and each drawn chart ends inside its box
