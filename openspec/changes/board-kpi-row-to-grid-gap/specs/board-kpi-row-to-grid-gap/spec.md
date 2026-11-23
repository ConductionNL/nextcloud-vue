# board-kpi-row-to-grid-gap Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-kpi-row-to-grid-gap](../../)

## Purpose

The first grid card stands the section gap under the KPI row.

## ADDED Requirements

### Requirement: The board grid stands the section gap under the KPI row

In the board look, a `CnDashboardPage` grid that follows the KPI row or the view switch row SHALL reach up by the grid
margin, so its first cards stand that row's bottom margin under it.

#### Scenario: DqDashboard

- **GIVEN** the dashboard in the board look with its five tiles and the two chart cards under them
- **THEN** the chart cards start 20px under the tiles

#### Scenario: DqMijnWerk

- **GIVEN** the My work view in the board look with its view switch above the grid
- **THEN** the First today banner starts 20px under the switch row
