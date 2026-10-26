# board-dashboard-rows-normal-leading Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-dashboard-rows-normal-leading](../../)

## Purpose

A record-list row on a board dashboard is as tall as the boards draw it.

## ADDED Requirements

### Requirement: A board dashboard row is set at the normal line height

In the board look, a `CnRecordListWidget` row on a dashboard page SHALL set its title and its meta line at the font's
normal line height. The Nextcloud look keeps the body line height.

#### Scenario: DqDashboard "Mijn zaken"

- **GIVEN** the dossiq dashboard in the board look with a one-line title and a meta line
- **THEN** the row is 60px high
