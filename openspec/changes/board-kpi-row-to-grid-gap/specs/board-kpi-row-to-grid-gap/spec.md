# board-kpi-row-to-grid-gap Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-kpi-row-to-grid-gap](../../)

## Purpose

The first grid card stands the section gap under the KPI row.

## ADDED Requirements

### Requirement: The board grid stands the section gap under the KPI row

In the board look, a `CnDashboardPage` grid that follows the KPI row SHALL reach up by the grid margin, so its first
cards stand the KPI row's bottom margin under the tiles.

#### Scenario: DqDashboard

- **GIVEN** the dashboard in the board look with its five tiles and the two chart cards under them
- **THEN** the chart cards start 20px under the tiles
