# Tasks: saved-view-icon-description-count

### Task 1: Icon and description
- **spec_ref**: `openspec/changes/saved-view-icon-description-count/specs/saved-view-icon-description-count/spec.md#requirement-a-saved-view-has-an-icon-and-a-description`
- **files**: `src/components/CnSavedViewLookFields/`, `src/components/CnSaveViewDialog/CnSaveViewDialog.vue`, `src/components/CnSavedViewEditDialog/CnSavedViewEditDialog.vue`, `src/components/CnIndexPage/CnIndexPage.vue`, `src/utils/savedViewMenu.js`, `src/utils/savedViewHelpers.js`, `src/components/CnAppNav/CnAppNav.vue`
- [x] Implement
- [x] Test: `tests/components/SavedViewIconDescriptionCount.spec.js`

### Task 2: The count
- **spec_ref**: `openspec/changes/saved-view-icon-description-count/specs/saved-view-icon-description-count/spec.md#requirement-a-saved-view-in-the-menu-shows-its-count`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue`
- [x] Implement: count by default, `overrides.badge: false` off
- [x] Test: `tests/components/SavedViewIconDescriptionCount.spec.js`, `tests/components/CnSavedViewsManage.spec.js`
