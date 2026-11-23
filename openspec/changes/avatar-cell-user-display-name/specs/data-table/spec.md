# data-table Delta: avatar-cell-user-display-name

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [avatar-cell-user-display-name](../../)

## Purpose

A cell that holds a person's user id names the person, not the account.

## ADDED Requirements

### Requirement: An avatar cell holding a user id shows the user's display name

An `avatar` cell with `widgetProps.user: true` SHALL show, beside the picture, the display name of the Nextcloud user
whose id the cell holds. A name read from `widgetProps.nameField` SHALL take precedence. While the display name is
being looked up, and when the id resolves to no name, the cell SHALL show the id. An avatar cell without `user` SHALL
render as before.

#### Scenario: Handler of a task

- **GIVEN** a column `{ key: "assignee", widget: "avatar", widgetProps: { user: true } }`
- **AND** a row whose `assignee` is `pieter`, whose display name is "Pieter Jansen"
- **WHEN** the table renders and the name has been looked up
- **THEN** the cell shows the avatar of `pieter` and the name "Pieter Jansen", not "pieter"
