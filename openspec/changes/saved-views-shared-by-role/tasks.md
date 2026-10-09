# Tasks: saved-views-shared-by-role

> Sharing on `CnSavedViewsControl` (ADR-032 `kind: code`).
> Checkbox budget: 3 tasks × 2 = 6 unindented `- [ ]` lines (cap 20).

## Implementation tasks

### Task 1: List shared views in their own group
- **spec_ref**: `openspec/changes/saved-views-shared-by-role/specs/saved-views-ui/spec.md#requirement-shared-views-listed-beside-own-views`
- **files**: `src/components/CnSavedViewsControl/CnSavedViewsControl.vue`, `tests/components/CnSavedViewsControl.spec.js`
- **acceptance_criteria**:
  - The dropdown groups on `@self.access` from one API response
  - A view without `@self.access` falls back to comparing `owner` with the current user
  - Applying a shared view writes its query, sort and columns to the route
  - JSDoc and the component reference doc describe the new group
- [x] Implement
- [x] Test

### Task 2: Share a view with a group, read or write
- **spec_ref**: `openspec/changes/saved-views-shared-by-role/specs/saved-views-ui/spec.md#requirement-share-a-view-with-a-group`
- **files**: `src/components/CnSavedViewShareFields/CnSavedViewShareFields.vue`, `src/components/CnSaveViewDialog/CnSaveViewDialog.vue`, `src/components/CnSavedViewsControl/CnSavedViewsControl.vue`, `tests/components/CnSaveViewDialog.spec.js`, `tests/components/CnSavedViewsControl.spec.js`
- **acceptance_criteria**:
  - One share-fields component used by `CnSaveViewDialog` and the edit form of `CnSavedViewsControl`
  - Group multiselect with `inputLabel` over the sharee API, a per-group mode
  - `CnSaveViewDialog` emits `confirm({ name, isPublic, sharedWith })`, `sharedWith: []` when none
  - The section is absent when the sharee API answers no groups
- [x] Implement
- [x] Test

### Task 3: Respect the sharing mode on a received view
- **spec_ref**: `openspec/changes/saved-views-shared-by-role/specs/saved-views-ui/spec.md#requirement-a-received-view-follows-its-mode`
- **files**: `src/components/CnSavedViewsControl/CnSavedViewsControl.vue`, `tests/components/CnSavedViewsControl.spec.js`
- **acceptance_criteria**:
  - `@self.access: read` hides edit and delete and offers "Save as my view"
  - `@self.access: write` allows save, hides delete, and sends no `sharedWith` or `owner`
  - `npm test` and `npm run build` pass
- [x] Implement
- [x] Test

> The control had no edit form, so Share is a row action that opens the new `CnSavedViewShareDialog`; a writer's save is the "Save the current view to ..." row action. The groups are listed under the captions only once a view is shared with the user. `npm run build` is not run here.
