# workspace-filter-export-table Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [workspace-filter-export-table](../../)

## Purpose

A report form can offer the export of the table it loads, beside its load button.

## ADDED Requirements

### Requirement: A workspace filter input can export the table it loads

With `exportTable: { exportId, label? }` a workspace filter input (`style: "input"`) SHALL draw a secondary button
(`type="button"`) beside its load button, labelled `label` or "Export CSV", that emits `cn:widget:export` with that
`exportId`, so the object table with that `exportId` downloads its rows as CSV. Without `exportTable` the form SHALL be
unchanged. In the board look the button SHALL be the 40px control, 14px in.

#### Scenario: DqTermijnen quarterly report

- **GIVEN** the quarter form with `exportTable: { exportId: "deadline-report-quarterly" }` over a table with that `exportId`
- **THEN** "CSV exporteren" sits beside "Rapport laden" and pressing it downloads the table's rows
