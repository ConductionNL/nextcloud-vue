# Tasks: screens-page-controls

### Task 1: Toggle and bar
- **spec_ref**: `openspec/changes/screens-page-controls/specs/page-controls/spec.md#requirement-a-toggle-and-a-select-are-page-controls`
- [x] Implement: `style: "toggle"`, `layout: "bar"`, `controls`, `align`
- [x] Test: `tests/components/ScreensPageControls.spec.js`; e2e `e2e/page-controls.e2e.js`

### Task 2: Lists listen
- **spec_ref**: `openspec/changes/screens-page-controls/specs/page-controls/spec.md#requirement-a-list-listens-to-the-pages-controls`
- **files**: `src/utils/pageControls.js`, `CnRecordListWidget.vue`, `CnWidgetObjectTable.vue`
- [x] Implement: `pageControls.sort`, `pageControls.toggle`
- [x] Test: `tests/components/ScreensPageControls.spec.js`, `tests/components/CnWidgetObjectTable/CnWidgetObjectTableDashboard.spec.js`

### Task 3: Schema and docs
- [x] Schema `pageControls`, toggle/bar keys; docs in cn-workspace-filter-widget.md, cn-record-list-widget.md, cn-widget-object-table.md
