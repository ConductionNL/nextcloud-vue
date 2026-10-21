# condition-tree-editor Delta: condition-tree-editor

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [condition-tree-editor](../../)

## Purpose

A user builds a rule of AND/OR groups of conditions with the keyboard, and sees how many records it matches.

## ADDED Requirements

### Requirement: A user builds AND/OR groups of conditions

The editor SHALL edit a tree `{ type: 'AND'|'OR', children }` whose children are groups or conditions
`{ field, operator, value }`, to any depth. A group SHALL add a condition, add a nested group, switch between all and
any, and a nested group SHALL be removable. Choosing a field SHALL reset the condition to the first operator of the
field's type and an empty value (true for a yes/no field). A date field SHALL also offer before and after. A stored field
or operator the editor does not offer SHALL still be shown. Every control SHALL be a select, a field or a button, so the
tree is built with the keyboard.

#### Scenario: A nested group

- GIVEN a rule with one condition
- WHEN the user adds a group
- THEN the rule SHALL hold the condition and an AND group with one empty condition

### Requirement: A finished tree is checked and counted by the app

With `previewEndpoint`, the editor SHALL post a tree whose every condition is finished, after a pause in editing, as
`body[rulesKey]`, and SHALL show the count the answer holds. An answer that says the tree is not valid SHALL show its
message at the node the message's path names (`$.children[1]: ...`), or above the tree when it names none. Without
`previewEndpoint` a finished tree SHALL be valid as it stands. The editor SHALL report its state (`status-change`) and
whether it is valid (`validity-change`).

#### Scenario: The estimate

- GIVEN a finished rule and a preview endpoint answering `{ valid: true, estimatedSize: 42 }`
- WHEN the pause after the last edit has passed
- THEN the editor SHALL show 42

#### Scenario: An error at its condition

- GIVEN an endpoint answering `{ valid: false, error: '$.children[0]: field "city" is not declared.' }`
- THEN the first condition SHALL show 'field "city" is not declared.'
