# Tasks: tabs-stack-follows-page-controls

### Task 1: Stacked widgets follow the workspace
- **spec_ref**: `openspec/changes/tabs-stack-follows-page-controls/specs/tabs-widget/spec.md#requirement-a-widget-in-a-tab-stack-follows-the-page-controls`
- **files**: `src/components/CnTabsWidget/CnTabsWidget.vue`, `docs/components/cn-tabs-widget.md`
- [x] Implement: inject `cnWorkspaceContext`, leave out a stacked widget whose workspace `visibleWhen` does not hold
- [x] Test: `tests/components/CnTabsWidgetStackWorkspace.spec.js`
