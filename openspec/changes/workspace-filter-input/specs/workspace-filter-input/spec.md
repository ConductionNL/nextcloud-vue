# workspace-filter-input Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [workspace-filter-input](../../)

## Purpose

A workspace filter can be a report form: a field and a load button.

## ADDED Requirements

### Requirement: A workspace filter can be an input loaded by a button

A `workspace-filter` with `style: "input"` SHALL draw a labelled text field and a submit button. It SHALL write the
field's value to its workspace key only on submit and only when the value has the input's form (`quarter`: `YYYY-Qn`,
`year`: `YYYY`, otherwise `pattern` when given). A refused value SHALL leave the workspace unchanged, mark the field
`aria-invalid` and show why under it. The field SHALL start with the workspace's value, else `default`, else the current
quarter or year for those types, and that starting value SHALL be written to the workspace.

#### Scenario: Quarterly report

- **GIVEN** an input of type quarter writing `quarter`, and the workspace holding `2026-Q2`
- **WHEN** the reader types `2025-Q4` and presses "Rapport laden"
- **THEN** the workspace holds `2025-Q4` and the report reads that quarter

#### Scenario: Wrong form

- **WHEN** the reader types `2026-5` and loads
- **THEN** the workspace keeps `2026-Q2` and the field says how to write a quarter
