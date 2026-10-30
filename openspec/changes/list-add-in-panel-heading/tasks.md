# Tasks: list-add-in-panel-heading

### Task 1: A list puts its Add in the title row
- **spec_ref**: `openspec/changes/list-add-in-panel-heading/specs/object-list/spec.md#requirement-a-list-can-put-its-add-in-the-title-row`
- **files**: `src/components/CnObjectListWidget/CnObjectListWidget.vue`
- [x] Implement: `addPlacement: "header"`, `addIcon`, the Add in the header report, none below the rows
- [x] Test: `tests/components/CnObjectListWidgetAddInHeader.spec.js`

### Task 2: A tab panel heading carries what its widget reports
- **spec_ref**: `openspec/changes/list-add-in-panel-heading/specs/object-list/spec.md#requirement-a-tab-panel-heading-carries-what-its-widget-reports`
- **files**: `src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue`, `src/components/CnTabsWidget/CnTabsWidget.vue`
- [x] Implement: bare host emits `panel-header`; showTitle panel heading draws its subtitle and actions
- [x] Test: `tests/components/CnTabsWidgetPanelHeader.spec.js`
