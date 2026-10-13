# Tasks: screens-record-list-row-action

### Task 1: One action per row
- **spec_ref**: `openspec/changes/screens-record-list-row-action/specs/record-list/spec.md#requirement-a-record-list-row-can-end-in-one-action`
- **files**: `src/components/CnRecordListWidget/CnRecordListWidget.vue`, `docs/components/cn-record-list-widget.md`
- [x] Implement: `rowAction`, its label per row, link or dispatched button
- [x] Test: `tests/components/CnRecordListWidgetRowAction.spec.js`; e2e `e2e/l8-record-list-row-action.e2e.js` (fails without the change)

### Task 2: The count after the card title
- **spec_ref**: `openspec/changes/screens-record-list-row-action/specs/record-list/spec.md#requirement-a-dashboard-card-can-show-its-lists-count-after-the-title`
- **files**: `src/components/CnRecordListWidget/CnRecordListWidget.vue`, `src/components/CnDashboardPage/CnDashboardPage.vue`
- [x] Implement: `headerCount`, the chip in `title-meta`
- [x] Test: `tests/components/CnDashboardPageWidgetHeaderCount.spec.js`, `tests/components/CnRecordListWidgetRowAction.spec.js`; same e2e
