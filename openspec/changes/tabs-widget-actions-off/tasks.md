# Tasks: tabs-widget-actions-off

### Task 1: A manifest can turn off the tab strip's Actions menu
- **spec_ref**: `openspec/changes/tabs-widget-actions-off/specs/tabs-widget-actions-off/spec.md#requirement-a-manifest-can-turn-off-the-tab-strips-actions-menu`
- **files**: `src/components/CnTabsWidget/CnTabsWidget.vue`, `docs/components/cn-tabs-widget.md`
- [x] Implement: `showActions` prop, default true; `false` drops the menu
- [x] Test: `tests/components/CnTabsWidgetActionsOff.spec.js`; e2e `e2e/l18-tabs-actions-off.e2e.js` (`?l7=l18-tabs-actions-off`)
