# Tasks: declared-props-detail-index-sidebar

### Task 1: A widget host passes only the keys a widget declares
- **spec_ref**: `openspec/changes/declared-props-detail-index-sidebar/specs/widget-hosts/spec.md#requirement-a-widget-host-passes-only-the-keys-a-widget-declares`
- **files**: `src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue`, `src/components/CnIndexPage/CnIndexPageWidgets.vue`, `src/components/CnObjectSidebar/CnObjectSidebar.vue`
- [x] Implement: `pickDeclaredProps` in each host
- [x] Test: `tests/components/WidgetHostsDeclaredProps.spec.js`, `tests/components/CnObjectSidebar.spec.js`; e2e `e2e/l25-widget-hosts-declared-props.e2e.js` (`?l8=hosts-declared-props`)
