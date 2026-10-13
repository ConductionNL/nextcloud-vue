# data-table Delta: screens-secondary-enum-label

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-secondary-enum-label](../../)

## Purpose

A cell's second line reads like a cell: an enum field shows its label.

## ADDED Requirements

### Requirement: A secondary line shows an enum field by its label

When a column's `secondary` names a field (as a bare key or inside a `{field}` template) whose schema property is an
enum, the table SHALL show that field's label from `x-enum-labels` (or `enumLabels`) in the user's language, and the
translated stored value when it has no label. A field that is not an enum SHALL show its stored value as before.

#### Scenario: Meeting type under the body

- **GIVEN** a column `{ key: "bodyName", secondary: "meetingType" }` and `meetingType` an enum with label "Regular meeting" for `regular`
- **WHEN** a row with `meetingType: "regular"` renders
- **THEN** the second line reads "Regular meeting" (in Dutch "Gewone vergadering"), not "regular"
