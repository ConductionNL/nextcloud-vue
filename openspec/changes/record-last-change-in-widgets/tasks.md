# Tasks: record-last-change-in-widgets

### Task 1: A widget can read who changed the record last
- **spec_ref**: `openspec/changes/record-last-change-in-widgets/specs/record-last-change-in-widgets/spec.md#requirement-a-widget-can-read-who-changed-the-record-last`
- **files**: `src/components/CnDetailPage/CnDetailPage.vue`, `src/components/CnFactsWidget/CnFactsWidget.vue`, docs
- [x] Implement: `recordLastChange` prop and the `cnRecordLastChange` provide; facts reads `_lastChange.*`
- [x] Test: `tests/components/CnRecordLastChangeInWidgets.spec.js`
