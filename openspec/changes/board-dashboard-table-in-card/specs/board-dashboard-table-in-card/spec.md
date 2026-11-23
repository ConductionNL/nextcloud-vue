# board-dashboard-table-in-card Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-dashboard-table-in-card](../../)

## Purpose

A table on a board dashboard card sits on the card, as the boards draw it.

## ADDED Requirements

### Requirement: A table on a board dashboard card has no frame of its own

In the board look, a `CnDataTable` inside a `CnDashboardPage` widget card SHALL draw no border and no radius, and its
board pager SHALL pad 12px at the top and nothing at the sides or bottom. A table that is a page's own card keeps its
frame.

#### Scenario: DqDoorlooptijd "Prestaties per zaaktype"

- **GIVEN** the processing-time report in the board look
- **THEN** the table has no border inside the card, and "4 van 39" starts at the card's 22px inset
