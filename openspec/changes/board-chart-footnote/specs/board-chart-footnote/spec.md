# board-chart-footnote Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-chart-footnote](../../)

## Purpose

A chart's footnote reads as the board's small muted line under every chart type.

## ADDED Requirements

### Requirement: A board chart footnote under a bar list or matrix is a small muted line

In the board look a chart footnote under a bar list or a matrix SHALL be 13px at normal line height in the muted text
colour, as the footnote under a plot already is.

#### Scenario: DqDashboard

- **GIVEN** the "Zaken per status" bar list with its footnote in the board look
- **THEN** "Klik een balk om de zaken te zien" is 13px in the muted text colour, not 15px in the full ink
