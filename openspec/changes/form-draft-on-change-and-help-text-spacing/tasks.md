# Tasks: form-draft-on-change-and-help-text-spacing

## Implementation Tasks

### Task 1: A draft is written only after a person changes a field
- **spec_ref**: `openspec/changes/form-draft-on-change-and-help-text-spacing/specs/form-draft-on-change-and-help-text-spacing/spec.md#requirement-a-draft-is-written-only-after-a-person-changes-a-field`
- **files**: `src/composables/useFormDraft.js`, `src/components/CnFormDialog/CnFormDialog.vue`, `tests/components/CnFormDialogDraftOnChange.spec.js`, `src/composables/__tests__/useFormDraft.spec.js`
- [x] Implement
- [x] Test

### Task 2: A draft belongs to the signed-in user
- **spec_ref**: `openspec/changes/form-draft-on-change-and-help-text-spacing/specs/form-draft-on-change-and-help-text-spacing/spec.md#requirement-a-draft-belongs-to-the-signed-in-user`
- **files**: `src/composables/useFormDraft.js`, `src/components/CnFormDialog/CnFormDialog.vue`, `src/components/CnFormPage/CnFormPage.vue`, `tests/components/CnFormDialogDraftOnChange.spec.js`, `tests/components/CnFormPageDraft.spec.js`, `src/composables/__tests__/useFormDraft.spec.js`
- [x] Implement
- [x] Test

### Task 3: Help text starts below every input
- **spec_ref**: `openspec/changes/form-draft-on-change-and-help-text-spacing/specs/form-draft-on-change-and-help-text-spacing/spec.md#requirement-help-text-starts-below-every-input`
- **files**: `src/css/form-field.css`, `e2e/form-field-hint.e2e.js`, `e2e/harness/FieldHintHarness.vue`, `e2e/harness/App.vue`
- [x] Implement
- [x] Test

### Task 4: A field description shows once
- **spec_ref**: `openspec/changes/form-draft-on-change-and-help-text-spacing/specs/form-draft-on-change-and-help-text-spacing/spec.md#requirement-a-field-description-shows-once`
- **files**: `src/components/CnFormDialog/CnFormDialog.vue`, `tests/components/CnFormDialogDraftOnChange.spec.js`, `e2e/form-field-hint.e2e.js`
- [x] Implement
- [x] Test
