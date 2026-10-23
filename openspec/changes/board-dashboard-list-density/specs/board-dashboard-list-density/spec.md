# board-dashboard-list-density Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-dashboard-list-density](../../)

## Purpose

A dashboard card's list rows are as dense as the Dq dashboards draw them.

## ADDED Requirements

### Requirement: A board dashboard list row is padded 12px

In the board look a record-list row on a dashboard page SHALL be padded 12px above and below, with its title at
weight 600.

#### Scenario: DqDashboard "Zaken die u volgt"

- **GIVEN** the dossiq dashboard in the board look
- **THEN** each followed case's row has 12px above and below its text
