# Tasks: record-task-table

### Task 1: A record's tasks show as a table with their summary and New task in the header
- **spec_ref**: `openspec/changes/record-task-table/specs/record-task-table/spec.md#requirement-a-records-tasks-show-as-a-table-with-their-summary-and-new-task-in-the-header`
- **files**: `src/components/CnTasksWidget/CnTasksWidget.vue`, `src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue`, `src/components/CnDetailWidgetHost/CnDetailWidgetHeaderItems.vue`, `src/css/look-board-detail.css`, `l10n/nl.json`, `l10n/en.json`
- [x] Implement: record scope, table variant, header subtitle and primary action, create, completeAny, cancel, board row button
- [x] Test: `tests/components/CnTasksWidgetTable.spec.js`, `tests/components/CnRecordTaskTableHeader.spec.js`
