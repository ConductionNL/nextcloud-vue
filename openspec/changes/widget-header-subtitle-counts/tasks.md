# Tasks: widget-header-subtitle-counts

### Task 1: A list can say its counts under its card title
- **spec_ref**: `openspec/changes/widget-header-subtitle-counts/specs/widget-header-subtitle-counts/spec.md#requirement-a-list-can-say-its-counts-under-its-card-title`
- **files**: `src/utils/fillCountLabel.js`, `src/components/CnRecordListWidget/CnRecordListWidget.vue`, `src/components/CnObjectListWidget/CnObjectListWidget.vue`, `src/components/CnChecklistWidget/CnChecklistWidget.vue`, docs
- [x] Implement: shared count grammar; `headerSubtitle` on both lists; `summaryInHeader` on the checklist
- [x] Test: `tests/utils/fillCountLabel.spec.js`, `tests/components/CnHeaderSubtitleCounts.spec.js`
