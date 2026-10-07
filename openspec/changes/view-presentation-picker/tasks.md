# Tasks: view-presentation-picker

> Presentation editor for saved views over OpenRegister's `presentation`
> (ADR-032 `kind: code`).

## Implementation tasks

### Task 1: Candidates per role
- **spec_ref**: `openspec/changes/view-presentation-picker/specs/saved-views-ui/spec.md#requirement-a-views-presentation-is-picked-when-it-is-saved`
- **files**: `src/utils/presentationCandidates.js`, `tests/utils/presentationCandidates.spec.js`
- **acceptance_criteria**:
  - Group, card and date candidates per design D1, with a reason when a role has none
  - JSDoc on the export
- [ ] Implement
- [ ] Test

### Task 2: CnViewPresentationPicker
- **spec_ref**: `openspec/changes/view-presentation-picker/specs/saved-views-ui/spec.md#requirement-a-views-presentation-is-picked-when-it-is-saved`
- **files**: `src/components/CnViewPresentationPicker/`, `src/components/index.js`, `tests/components/CnViewPresentationPicker.spec.js`
- **acceptance_criteria**:
  - Props `schema`, `value` with defaults; emits `input` in OpenRegister's shape only
  - Disabled types carry their reason; card fields capped at four; column order as a drag list
  - Every `NcSelect` has an `inputLabel`; `cn-` classes
- [ ] Implement
- [ ] Test

### Task 3: Save dialog and edit form
- **spec_ref**: `openspec/changes/view-presentation-picker/specs/saved-views-ui/spec.md#requirement-the-save-dialog-and-the-edit-form-carry-the-picker`
- **files**: `src/components/CnSaveViewDialog/CnSaveViewDialog.vue`, `src/components/CnSavedViewsControl/CnSavedViewsControl.vue`, `tests/components/CnSaveViewDialog.spec.js`, component reference docs
- **acceptance_criteria**:
  - Optional `schema` prop; `presentation` in `confirm` only when it is set
  - Picker in the edit form for `owner` and `write`
  - Refusals naming the three paths land under their picker
  - `npm test` and `npm run build` pass
- [ ] Implement
- [ ] Test
