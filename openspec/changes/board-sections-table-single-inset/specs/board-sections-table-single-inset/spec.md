# board-sections-table-single-inset Delta

**Status**: proposed
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: A table inside a dashboard sections card is inset once

In the board look, a widget table inside a sections widget on a dashboard card SHALL take no side or bottom padding of
its own, so it spans the sections body, and a record list there SHALL take no side padding of its own.

#### Scenario: DqTermijnen Kwartaalrapport

- **GIVEN** a 1120px card holding the quarter form and the quarterly table as sections
- **THEN** the table is 1074px wide, 23px in from each side of the card
