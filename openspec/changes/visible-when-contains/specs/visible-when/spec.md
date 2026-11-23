# visible-when Delta: visible-when-contains

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [visible-when-contains](../../)

## Purpose

Let a condition ask whether a list holds a value.

## ADDED Requirements

### Requirement: A condition can ask whether a list holds a value

`compareVisibleWhen` SHALL accept `op: "contains"`, which holds when the value is a list with an entry equal (loosely, as `eq`) to the resolved `value`. A value that is not a list, or a missing `value`, SHALL NOT match.

#### Scenario: An overview card a case type names

- **GIVEN** `{ field: "caseType.overviewCards", op: "contains", value: "tender-lots" }`
- **WHEN** the record's case type has `overviewCards: ["facts", "tender-lots"]`
- **THEN** the condition holds, and with `overviewCards: ["facts"]` it does not
