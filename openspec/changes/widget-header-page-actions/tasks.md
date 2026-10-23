# Tasks: widget-header-page-actions

### Task 1: A widget header button can open the page's edit form or another tab
- **spec_ref**: `openspec/changes/widget-header-page-actions/specs/widget-header-page-actions/spec.md#requirement-a-widget-header-button-can-open-the-pages-edit-form-or-another-tab`
- **files**: `src/utils/widgetHeaderActions.js`, `src/components/CnDetailPage/CnDetailPage.vue`, `src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue`, `src/components/CnTabsWidget/CnTabsWidget.vue`, `docs/components/cn-widget-wrapper.md`
- [x] Implement: `cnRecordEdit` provide; `edit-record` and `open-tab` in the resolver; host and tabs pass the record edit
- [x] Test: `tests/utils/widgetHeaderActionsEditRecord.spec.js`, `tests/components/CnDetailPageRecordEditProvide.spec.js`
