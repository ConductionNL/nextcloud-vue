# board-dashboard-widget-count Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-dashboard-widget-count](../../)

## Purpose

A dashboard card's count chip is as tall as the board draws it.

## ADDED Requirements

### Requirement: A dashboard card's count chip is 17px

In the board look the count chip after a dashboard card's title SHALL set its 13px figure on a 15px line with 1px 8px
padding, so it is 17px tall.

#### Scenario: DqDagAfsluiten

- **GIVEN** the end-of-day dashboard in the board look
- **THEN** the counts after "Nog open van vandaag" and "Vandaag vastgelegd" are 17px tall
