# Tasks: index-toolbar-start-and-active-only-quick-filters

### Task 1: A page can put its own controls at the start of the toolbar row
- **spec_ref**: `openspec/changes/index-toolbar-start-and-active-only-quick-filters/specs/index-page/spec.md#requirement-a-page-can-put-its-own-controls-at-the-start-of-the-toolbar-row`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue`
- [x] Implement: `toolbar-start` slot inside the bar's `filters` slot, before the quick-filter bar
- [x] Test: `tests/components/CnIndexPageToolbarStart.spec.js`

### Task 2: Quick filters can show only on the Active line
- **spec_ref**: `openspec/changes/index-toolbar-start-and-active-only-quick-filters/specs/index-page/spec.md#requirement-quick-filters-can-show-only-on-the-active-line`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue`, `src/schemas/app-manifest-v2.schema.json`
- [x] Implement: placement `active`, schema enum, 2.154.0 + hash
- [x] Test: `tests/components/CnIndexPageToolbarStart.spec.js`, `tests/schemas/app-manifest-v2.schema.spec.js`
