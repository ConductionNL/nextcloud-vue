# Tasks: saved-views-shared-by-role

> Sharing on `CnSavedViewsControl` (ADR-032 `kind: code`).
> Checkbox budget: 3 tasks × 2 = 6 unindented `- [ ]` lines (cap 20).

## Implementation tasks

### Task 1: List shared views in their own group
- **spec_ref**: `openspec/changes/saved-views-shared-by-role/specs/saved-views-ui/spec.md#requirement-shared-views-listed-beside-own-views`
- **files**: `src/components/CnSavedViewsControl/CnSavedViewsControl.vue`, `src/components/CnSavedViewsControl/__tests__/CnSavedViewsControl.spec.js`
- **acceptance_criteria**:
  - The dropdown renders "My views" and "Shared with me" groups from one API response
  - A view without `sharedWith` lists under "My views" only
  - Applying a shared view writes its query, sort and columns to the route
  - JSDoc and the component reference doc describe the new group
- [ ] Implement
- [ ] Test

### Task 2: Share a view with a group, read or write
- **spec_ref**: `openspec/changes/saved-views-shared-by-role/specs/saved-views-ui/spec.md#requirement-share-a-view-with-a-group`
- **files**: `src/components/CnSavedViewsControl/CnSavedViewsControl.vue`, `src/components/CnSavedViewsControl/CnSavedViewsShareFields.vue`, `src/components/CnSavedViewsControl/__tests__/CnSavedViewsControl.spec.js`
- **acceptance_criteria**:
  - The save form offers a group multiselect with `inputLabel` and a per-group mode
  - The PUT body carries `sharedWith: [{ group, mode }]`
  - The section is absent when the API returns no groups for the caller
- [ ] Implement
- [ ] Test

### Task 3: Respect the sharing mode on a received view
- **spec_ref**: `openspec/changes/saved-views-shared-by-role/specs/saved-views-ui/spec.md#requirement-a-received-view-follows-its-mode`
- **files**: `src/components/CnSavedViewsControl/CnSavedViewsControl.vue`, `src/components/CnSavedViewsControl/__tests__/CnSavedViewsControl.spec.js`
- **acceptance_criteria**:
  - `mode: read` hides edit and delete and offers "Save as my view"
  - `mode: write` allows save and keeps owner and `sharedWith` unchanged
  - `npm test` and `npm run build` pass
- [ ] Implement
- [ ] Test
