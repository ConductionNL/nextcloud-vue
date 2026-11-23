# tasks-table-inline-cancel-summary-note Delta: record-task-table

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [tasks-table-inline-cancel-summary-note](../../)

## ADDED Requirements

### Requirement: The task table can draw Cancel beside Complete

With `content.cancelInline: true` the task table SHALL draw Cancel ("Cancel", through the widget's translate) as a secondary button in the row's actions cell, beside Complete, wherever it offers Cancel, and SHALL leave the Cancel entry out of the row's menu. Without it Cancel SHALL stay in the menu.

### Requirement: The task table's summary can carry a note

`content.summaryNote` SHALL be appended to the table summary after " · ", through the widget's translate.
