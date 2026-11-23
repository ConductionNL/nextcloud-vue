# Tasks: record-list-notes

### Task 1: A record list can collect and record a note per row
- **spec_ref**: `openspec/changes/record-list-notes/specs/record-list-notes/spec.md#requirement-a-record-list-can-collect-and-record-a-note-per-row`
- **files**: `src/components/CnRecordListWidget/CnRecordNoteRows.vue`, `src/components/CnRecordListWidget/CnRecordListWidget.vue`
- [x] Implement: `presentation: "notes"`, `noteAction`, `rowLeaf`, `rowRouteField`
- [x] Test: `tests/components/CnRecordListWidgetNotes.spec.js`

### Task 2: A record list can say why it is empty
- **spec_ref**: `openspec/changes/record-list-notes/specs/record-list-notes/spec.md#requirement-a-record-list-can-say-why-it-is-empty`
- **files**: `src/components/CnRecordListWidget/CnRecordListWidget.vue`
- [x] Implement: `emptyTexts`
- [x] Test: `tests/components/CnRecordListWidgetNotes.spec.js`

### Task 3: A dashboard header meta can name today
- **spec_ref**: `openspec/changes/record-list-notes/specs/record-list-notes/spec.md#requirement-a-dashboard-header-meta-can-name-today`
- **files**: `src/components/CnDashboardPage/CnDashboardPage.vue`
- [x] Implement: `{today}` in `headerMeta`
- [x] Test: `tests/components/CnDashboardPageHeaderMetaToday.spec.js`
