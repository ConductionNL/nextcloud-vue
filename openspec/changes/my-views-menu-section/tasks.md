# Tasks: my-views-menu-section

### Task 1: The standard section
- **spec_ref**: `openspec/changes/my-views-menu-section/specs/app-nav/spec.md#requirement-every-app-menu-ends-with-my-views`
- **files**: `src/utils/savedViewMenu.js`, `src/components/CnAppRoot/CnAppRoot.vue`, `src/components/CnAppNav/CnAppNav.vue`
- [x] Implement: bottom placement, empty line, hint entry
- [x] Test: `tests/components/CnAppNavMyViews.spec.js`, `tests/components/CnSavedViewsManage.spec.js`

### Task 2: Default views from the user delta
- **spec_ref**: `openspec/changes/my-views-menu-section/specs/app-nav/spec.md#requirement-default-views-from-the-user-delta-join-the-page-defaults`
- **files**: `src/utils/mergeManifestDelta.js`
- [x] Implement: `defaultSavedViews` merges by `slug`
- [x] Test: `tests/utils/mergeManifestDeltaDefaultViews.spec.js`
