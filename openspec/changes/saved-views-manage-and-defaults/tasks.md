# Tasks: saved-views-manage-and-defaults

> Saved views: name, manage menu, edit, defaults (ADR-032 `kind: code`).
> Checkbox budget: 7 tasks x 2 = 14 unindented `- [ ]` lines (cap 20).

## Implementation tasks

### Task 1: Save view, everywhere
- **spec_ref**: `openspec/changes/saved-views-manage-and-defaults/specs/saved-views-ui/spec.md#requirement-the-control-is-called-save-view`
- **files**: `src/components/CnSavedViewsControl/CnSavedViewsControl.vue`, `src/components/CnIndexPage/CnIndexPage.vue`, `src/components/CnSaveViewDialog/CnSaveViewDialog.vue`, `l10n/*.json`
- **acceptance_criteria**:
  - en "Save view" / "Saved views", nl "Weergave opslaan" / "Opgeslagen weergaven"
  - No user-facing "Save view" left in these components
- [x] Implement
- [x] Test

### Task 2: Manage menu per row
- **spec_ref**: `openspec/changes/saved-views-manage-and-defaults/specs/saved-views-ui/spec.md#requirement-one-manage-menu-per-saved-view`
- **files**: `src/components/CnSavedViewsControl/CnSavedViewsControl.vue`, `tests/components/CnSavedViewsControl.spec.js`
- **acceptance_criteria**:
  - One labelled Manage button per row; entries gated by access
  - Existing test ids kept on the labelled entries
  - Back and menu close return to the list
- [x] Implement
- [x] Test

### Task 3: Edit dialog
- **spec_ref**: `openspec/changes/saved-views-manage-and-defaults/specs/saved-views-ui/spec.md#requirement-an-owner-can-edit-a-saved-view`
- **files**: `src/components/CnSavedViewEditDialog/`, `src/components/CnIndexPage/CnIndexPage.vue`, `tests/components/CnSavedViewEditDialog.spec.js`
- **acceptance_criteria**:
  - PATCH carries `name`, plus `query` only with the switch on
  - A refusal keeps the dialog open with the message
- [x] Implement
- [x] Test

### Task 4: Default views from the manifest
- **spec_ref**: `openspec/changes/saved-views-manage-and-defaults/specs/saved-views-ui/spec.md#requirement-an-app-ships-default-views`
- **files**: `src/schemas/app-manifest-v2.schema.json`, `src/utils/validateManifestV2.compiled.js`, `src/components/CnIndexPage/CnIndexPage.vue`, `src/utils/savedViewHelpers.js`, `tests/utils/savedViewHelpers.spec.js`
- **acceptance_criteria**:
  - Schema key with slug pattern, compiled validator regenerated
  - Defaults listed first, read-only, tokens resolved on apply, copy keeps tokens
- [x] Implement
- [x] Test

### Task 5: Share with users (needs openregister saved-view-user-shares)
- **spec_ref**: `openspec/changes/saved-views-manage-and-defaults/specs/saved-views-ui/spec.md#requirement-share-with-users-and-groups`
- **files**: `src/components/CnSavedViewShareFields/CnSavedViewShareFields.vue`, `src/utils/searchGroupSharees.js`, `src/utils/savedViewHelpers.js`, `tests/utils/searchGroupSharees.spec.js`
- **acceptance_criteria**:
  - Users and groups in one picker with `inputLabel`; `normalizeSharedWith` keeps `{user, mode}`
- [x] Implement
- [x] Test

### Task 6: Saved views in the filters sidebar
- **spec_ref**: `openspec/changes/saved-views-manage-and-defaults/specs/saved-views-ui/spec.md#requirement-saved-views-live-in-the-filters-sidebar`
- **files**: `src/components/CnSavedViewsPanel/`, `src/mixins/savedViewsList.js`, `src/components/CnIndexSidebar/CnIndexSidebar.vue`, `src/components/CnSavedViewsControl/CnSavedViewsControl.vue`, `src/components/CnIndexPage/CnIndexPage.vue`, `tests/components/CnSavedViewsManage.spec.js`
- **acceptance_criteria**:
  - A Filters tab lists, saves and manages, in the boards' order and wording; the toolbar keeps Save view and the chips
  - Share, edit and delete dialogs as boards DqFilterDelen, DqFilterBewerken and DqFilterVerwijderen
  - A page with saved views gets the sidebar unless it switched it off
- [x] Implement
- [x] Test

### Task 7: Add to menu
- **spec_ref**: `openspec/changes/saved-views-manage-and-defaults/specs/saved-views-ui/spec.md#requirement-a-saved-view-can-be-added-to-the-app-menu`
- **files**: `src/utils/savedViewMenu.js`, `src/components/CnAppRoot/CnAppRoot.vue`, `src/components/CnIndexPage/CnIndexPage.vue`, `tests/components/CnSavedViewsManage.spec.js`
- **acceptance_criteria**:
  - Per-user list in preferences, a My views group in the menu, `?savedView=` applies
  - Gone views drop out; an empty read never empties the menu
- [x] Implement
- [x] Test
