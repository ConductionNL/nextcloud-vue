# Tasks: record-checklist-widget

### Task 1: A checklist widget that writes through the record source
- **spec_ref**: `openspec/changes/record-checklist-widget/specs/record-checklist-widget/spec.md#requirement-a-checklist-widget-ticks-items-through-the-record-source`
- **files**: `src/components/CnChecklistWidget/`, `src/components/CnDetailPage/CnDetailPage.vue`, `src/composables/indexSources.js`, `src/composables/useTaskInboxStore.js`
- [x] Implement: `checkRecordItem` on the inbox store; `checkItem` and `canCheckItems` on the tasks source; `cnRecordChecklist` and `checkSourceItem` on CnDetailPage; the `checklist` catalog widget
- [x] Test: `tests/components/CnChecklistWidget.spec.js`
