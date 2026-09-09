# Tasks: write-feedback-toast-and-undo

> Toast, confirm and undo on the three writing components (ADR-032 `kind: code`).
> Checkbox budget: 4 tasks × 2 = 8 unindented `- [ ]` lines (cap 20).

## Implementation tasks

### Task 1: The feedback helper and confirm dialog
- **spec_ref**: `openspec/changes/write-feedback-toast-and-undo/specs/dialog-system/spec.md#requirement-req-dg-019-cnformdialog-reports-its-write`
- **files**: `src/composables/useWriteFeedback.js`, `src/dialogs/CnConfirmDialog.vue`, `src/composables/__tests__/useWriteFeedback.spec.js`
- **acceptance_criteria**:
  - `success`, `error` and `confirm` wrap `@nextcloud/dialogs` and the two-phase pattern
  - `success` with `undo` shows an Undo button for 10 s and runs the callback once
  - JSDoc on every exported function
- [ ] Implement
- [ ] Test

### Task 2: CnFormDialog toasts after save
- **spec_ref**: `openspec/changes/write-feedback-toast-and-undo/specs/dialog-system/spec.md#requirement-req-dg-019-cnformdialog-reports-its-write`
- **files**: `src/components/CnFormDialog/CnFormDialog.vue`, `src/components/CnFormDialog/__tests__/CnFormDialogFeedback.spec.js`
- **acceptance_criteria**:
  - A success toast names the object title or the schema title
  - `feedback: false` renders no toast
  - A failed save shows the error toast and keeps the dialog open
- [ ] Implement
- [ ] Test

### Task 3: CnLifecycleActions confirms and undoes
- **spec_ref**: `openspec/changes/write-feedback-toast-and-undo/specs/manifest-detail-lifecycle-actions/spec.md#requirement-req-mdla-6-a-transition-confirms-reports-and-offers-undo`
- **files**: `src/components/CnLifecycleActions/CnLifecycleActions.vue`, `src/components/CnLifecycleActions/__tests__/CnLifecycleActionsFeedback.spec.js`
- **acceptance_criteria**:
  - Danger, final-state and `confirm: true` transitions open the confirm dialog first
  - Cancel sends no request
  - Undo posts the reverse transition only when the graph declares one
- [ ] Implement
- [ ] Test

### Task 4: CnObjectListWidget toasts and undoes a delete
- **spec_ref**: `openspec/changes/write-feedback-toast-and-undo/specs/cn-workspace-context-widgets/spec.md#requirement-cnobjectlistwidget-reports-its-writes`
- **files**: `src/components/CnObjectListWidget/CnObjectListWidget.vue`, `src/components/CnObjectListWidget/__tests__/CnObjectListWidgetFeedback.spec.js`
- **acceptance_criteria**:
  - Create through the widget shows one toast, not two
  - Delete shows Undo and restores the row from the trash
  - `npm test` and `npm run build` pass; component reference docs updated
- [ ] Implement
- [ ] Test
