# board-dashboard-description-gap Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-dashboard-description-gap](../../)

## Purpose

The line under a board dashboard's title sits where the board draws it.

## ADDED Requirements

### Requirement: The board dashboard description sits 13px under the title

In the board look, the description in a dashboard header SHALL take no top margin, so the header's 6px row gap alone
spaces it from the title row. The Nextcloud look keeps its own margin.

#### Scenario: DqMijnWerk

- **GIVEN** the "Mijn werk" dashboard in the board look with its greeting line
- **THEN** the line's text starts 13px (within 0.5px) under the title's text
