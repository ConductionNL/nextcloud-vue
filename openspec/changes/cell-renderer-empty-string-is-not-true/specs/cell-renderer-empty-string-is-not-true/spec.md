# cell-renderer-empty-string-is-not-true Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [cell-renderer-empty-string-is-not-true](../../)

## Purpose

An empty value is shown as empty, never as `true`.

## ADDED Requirements

### Requirement: An empty string value is not a boolean true

The value props of CnCellRenderer, CnSegmentedControl, CnChoiceCards and CnPropertyValueCell SHALL declare String before
Boolean, so Vue passes an empty string through unchanged. A table cell whose value is an empty string SHALL render as
empty, not as a check mark.

#### Scenario: A member without a role

- **GIVEN** the Departments list with a member whose profile role is empty
- **THEN** the "Rollen" cell is empty, not a check mark
