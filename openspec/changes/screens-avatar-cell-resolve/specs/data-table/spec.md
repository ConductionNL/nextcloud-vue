# data-table Delta: screens-avatar-cell-resolve

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-avatar-cell-resolve](../../)

## Purpose

A person a row only refers to can be shown as a person.

## ADDED Requirements

### Requirement: An avatar cell can show a referenced object

An `avatar` cell whose `widgetProps.resolve` names a register and schema SHALL read its value as the id of an object
in that schema, and SHALL show that object's `labelField` (falling back to `title`, then `@self.name`) as the name,
with the name's initials in the circle. While the name is not resolved it SHALL show the id with an empty circle. An
empty cell SHALL show a dash. An avatar cell without `resolve` SHALL render as before.

#### Scenario: Chair of a meeting

- **GIVEN** a column `{ key: "chair", widget: "avatar", widgetProps: { size: 28, resolve: { register: "decidiq", schema: "participant", labelField: "fullName" } } }`
- **AND** a row whose `chair` is the uuid of participant "Anna de Vries"
- **WHEN** the table renders
- **THEN** the cell shows a 28px circle with "AV" and the name "Anna de Vries", and not the uuid
