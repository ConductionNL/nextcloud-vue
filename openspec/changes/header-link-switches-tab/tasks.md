# Tasks: header-link-switches-tab

### Task 1: A header link can open another tab of the page
- **spec_ref**: `openspec/changes/header-link-switches-tab/specs/header-link/spec.md#requirement-a-header-link-can-open-another-tab-of-the-page`
- **files**: `src/utils/contentHeaderLink.js`, `src/components/CnTabsWidget/CnTabsWidget.vue`, `src/schemas/app-manifest-v2.schema.json`, `docs/components/cn-widget-wrapper.md`
- [x] Implement: `headerLink.tab` as a `#<tab>` anchor; the tab strip follows a changed hash
- [x] Test: `tests/components/CnTabsWidgetHeaderLinkTab.spec.js`, `tests/schemas/app-manifest-v2.schema.spec.js`
