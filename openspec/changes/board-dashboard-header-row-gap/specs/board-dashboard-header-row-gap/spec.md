# board-dashboard-header-row-gap Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-dashboard-header-row-gap](../../)

## Purpose

The board dashboard header spaces its rows as the boards do.

## ADDED Requirements

### Requirement: The line under a board dashboard title sits 13px below it

In the board look the dashboard header SHALL stack its rows 6px apart, so the crumb or description stands about 13px
below the title's text when the title row holds 40px buttons.

#### Scenario: DqCatalogus

- **GIVEN** the catalogue page in the board look
- **THEN** "Instellingen / Catalogus" stands about 13px below "Catalogus"
