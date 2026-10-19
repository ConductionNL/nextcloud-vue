# Tasks: my-filters-menu-section

### Task 1: The standard section
- **spec_ref**: `openspec/changes/my-filters-menu-section/specs/app-nav/spec.md#requirement-every-app-menu-ends-with-my-filters`
- **files**: `src/utils/savedFilterMenu.js`, `src/components/CnAppRoot/CnAppRoot.vue`, `src/components/CnAppNav/CnAppNav.vue`
- [x] Implement: bottom placement, empty line, hint entry
- [x] Test: `tests/components/CnAppNavMyFilters.spec.js`, `tests/components/CnSavedFiltersManage.spec.js`

### Task 2: Default views from the user delta
- **spec_ref**: `openspec/changes/my-filters-menu-section/specs/app-nav/spec.md#requirement-default-views-from-the-user-delta-join-the-page-defaults`
- **files**: `src/utils/mergeManifestDelta.js`
- [x] Implement: `defaultSavedViews` merges by `slug`
- [x] Test: `tests/utils/mergeManifestDeltaDefaultViews.spec.js`
