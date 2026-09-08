# Tasks: form-dialog-autosave

> Draft state in `CnFormDialog` (ADR-032 `kind: code`).
> Checkbox budget: 3 tasks × 2 = 6 unindented `- [ ]` lines (cap 20).

## Implementation tasks

### Task 1: Local draft recovery
- **spec_ref**: `openspec/changes/form-dialog-autosave/specs/dialog-system/spec.md#requirement-req-dg-016-local-draft-recovery`
- **files**: `src/composables/useFormDraft.js`, `src/components/CnFormDialog/CnFormDialog.vue`, `src/components/CnFormDialog/__tests__/CnFormDialogDraft.spec.js`
- **acceptance_criteria**:
  - Values persist under the keyed storage entry, debounced
  - Reopen shows the recovery bar with Restore and Discard
  - Save and Discard clear the entry; entries older than 7 days are ignored
- [ ] Implement
- [ ] Test

### Task 2: Save draft and publish
- **spec_ref**: `openspec/changes/form-dialog-autosave/specs/dialog-system/spec.md#requirement-req-dg-017-server-side-draft`
- **files**: `src/components/CnFormDialog/CnFormDialog.vue`, `src/components/CnFormDialog/__tests__/CnFormDialogDraft.spec.js`
- **acceptance_criteria**:
  - `allowDraft: true` with a `draftField` renders Save draft; without either, it does not
  - Save draft bypasses required-field validation and sets the draft field
  - Publish runs full validation and clears the draft field
  - JSDoc and the component reference doc describe both props
- [ ] Implement
- [ ] Test

### Task 3: Saved indicator
- **spec_ref**: `openspec/changes/form-dialog-autosave/specs/dialog-system/spec.md#requirement-req-dg-018-saved-indicator`
- **files**: `src/components/CnFormDialog/CnFormDialog.vue`, `src/components/CnFormPage/CnFormPage.vue`, `src/components/CnFormDialog/__tests__/CnFormDialogDraft.spec.js`
- **acceptance_criteria**:
  - Footer text moves through Saving and Saved with an `aria-live="polite"` region
  - Colours come from Nextcloud CSS variables only
  - `npm test` and `npm run build` pass
- [ ] Implement
- [ ] Test
