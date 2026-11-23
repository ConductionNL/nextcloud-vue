# board-description-filter-row-40 Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-description-filter-row-40](../../)

## Purpose

A dashboard header whose description holds the page's filters is as tall as the boards draw it.

## ADDED Requirements

### Requirement: A filter description is a 40px row, 8px above the header's end

In the board look, a `CnDashboardPage` description select SHALL draw no margin, and a description with filters or a
period group SHALL pad 8px under it.

#### Scenario: DqDoorlooptijd

- **GIVEN** the processing-time report with its case type select and period group in the description
- **THEN** the description is 40px plus 8px under it and the header is 98px
