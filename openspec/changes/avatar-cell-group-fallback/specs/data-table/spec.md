# data-table Delta: avatar-cell-group-fallback

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [avatar-cell-group-fallback](../../)

## ADDED Requirements

### Requirement: An empty avatar cell can name the row's group

An `avatar` cell with `widgetProps.groupField` that holds no person SHALL show the display name of the first group id
in that row field, with the group name's initials in the circle, written into `groupLabel` at `{group}` when that is
set. While the name is looked up it SHALL show the id. A cell holding a person, or a row without a group, SHALL render
as before.

#### Scenario: A pooled task

- **GIVEN** a column `{ key: "assignee", widget: "avatar", widgetProps: { user: true, groupField: "candidateGroups", groupLabel: "{group}, unclaimed" } }`
- **AND** a task without assignee whose `candidateGroups` is `["woo-team"]`, display name "Team Woo"
- **THEN** the cell shows "TW" and "Team Woo, niet geclaimd"
