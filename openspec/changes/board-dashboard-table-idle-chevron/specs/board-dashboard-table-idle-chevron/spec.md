# board-dashboard-table-idle-chevron Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-dashboard-table-idle-chevron](../../)

## ADDED Requirements

### Requirement: An idle sort chevron on a dashboard card takes no room

In the board look, a `CnDataTable` on a dashboard card SHALL position an unsorted column's chevron outside the column's
width and show it only on hover or keyboard focus.

#### Scenario: DqDoorlooptijd "Prestaties per zaaktype"

- **THEN** the table is as wide as its text (569px) and hovering a head shows its chevron
