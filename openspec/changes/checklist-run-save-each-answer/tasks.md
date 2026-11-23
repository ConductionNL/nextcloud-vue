# Tasks: checklist-run-save-each-answer

### Task 1: A run can save each answer as it is given
- **spec_ref**: `openspec/changes/checklist-run-save-each-answer/specs/checklist-run-widget/spec.md#requirement-a-run-can-save-each-answer-as-it-is-given`
- **files**: `src/components/CnChecklistRunWidget/CnChecklistRunWidget.vue`, `docs/components/cn-checklist-run-widget.md`
- [x] Implement: `saveEachAnswer` with a debounce, one save at a time, a pending save on unmount
- [x] Test: `tests/components/CnChecklistRunWidgetSaveEachAnswer.spec.js`
