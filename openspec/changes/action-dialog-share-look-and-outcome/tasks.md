# Tasks: action-dialog-share-look-and-outcome

### Task 1: A dialog draws the board's choice rows, plain checkbox and spacing
- **spec_ref**: `openspec/changes/action-dialog-share-look-and-outcome/specs/action-dialog/spec.md#requirement-a-dialog-draws-the-boards-choice-rows-plain-checkbox-and-spacing`
- **files**: `src/components/CnActionDialog/CnActionDialog.vue`, `docs/components/cn-action-dialog.md`
- [x] Implement: cards `layout`, `columns`, `hideLabel`; checkbox `look: 'plain'`; `gap`
- [x] Test: `tests/components/CnActionDialogShareLook.spec.js`

### Task 2: The done text names what was chosen
- **spec_ref**: `openspec/changes/action-dialog-share-look-and-outcome/specs/action-dialog/spec.md#requirement-the-done-text-names-what-was-chosen`
- **files**: `src/components/CnActionDialog/CnActionDialog.vue`
- [x] Implement: `chosenRows`, `templateContext`, filled `doneMessage`
- [x] Test: `tests/components/CnActionDialogShareLook.spec.js`

### Task 3: The dialog can close once the act ran
- **spec_ref**: `openspec/changes/action-dialog-share-look-and-outcome/specs/action-dialog/spec.md#requirement-the-dialog-can-close-once-the-act-ran`
- **files**: `src/components/CnActionDialog/CnActionDialog.vue`
- [x] Implement: `closeOnDone`, `errorText`
- [x] Test: `tests/components/CnActionDialogShareLook.spec.js`
