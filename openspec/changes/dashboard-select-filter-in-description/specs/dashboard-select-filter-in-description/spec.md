# dashboard-select-filter-in-description Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [dashboard-select-filter-in-description](../../)

## Purpose

A dashboard's select page filter can sit on the header's description line, as the boards draw a scope choice.

## ADDED Requirements

### Requirement: A select page filter can sit on the description line

A dashboard page filter that is not a segmented group and has `placement: "description"` SHALL be drawn as a select on
the header's description line, after the description and before the period group, with its `label` as the combobox's
accessible name. It SHALL write the workspace context like a select in the filter row, and SHALL NOT also be drawn in
the filter row. Without a header it SHALL fall back to the filter row.

#### Scenario: DqDoorlooptijd case type

- **GIVEN** a dashboard with a clearable `caseType` select filter placed on the description line
- **THEN** the line reads the description, then the select showing "All case types", then the period group, and
  picking a case type writes it to the workspace context
