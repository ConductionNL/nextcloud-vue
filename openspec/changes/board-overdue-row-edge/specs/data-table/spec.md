# data-table Delta: board-overdue-row-edge

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-overdue-row-edge](../../)

## ADDED Requirements

### Requirement: A board table row marked overdue has a red leading edge

In the board look, a table row carrying the class `cn-row--overdue` SHALL show a 4px edge in the error colour on its
leading side. Rows without the class SHALL be drawn as before.

#### Scenario: DqTaken

- **GIVEN** the Tasks list with `rowClass: [{ when: { field: "dueAt", op: "lte", value: "@today" }, class: "cn-row--overdue" }]`
- **THEN** a task due yesterday or today shows a red edge at the start of its row
