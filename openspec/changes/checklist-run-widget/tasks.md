# Tasks: checklist-run-widget

### Task 1: A checklist run shows a page of questions at a time
- **spec_ref**: `openspec/changes/checklist-run-widget/specs/checklist-run-widget/spec.md#requirement-a-checklist-run-shows-a-page-of-questions-at-a-time`
- **files**: `src/components/CnChecklistRunWidget/CnChecklistRunWidget.vue`, `src/components/CnChecklistRunWidget/index.js`, `docs/components/cn-checklist-run-widget.md`
- [x] Implement: question source, types, pages, required, focus and live region, finish
- [x] Test: `tests/components/CnChecklistRunWidget.spec.js`

### Task 2: Answers are saved under the reader's own rights
- **spec_ref**: `openspec/changes/checklist-run-widget/specs/checklist-run-widget/spec.md#requirement-answers-are-saved-under-the-readers-own-rights`
- **files**: `src/components/CnChecklistRunWidget/CnChecklistRunWidget.vue`
- [x] Implement: object API create/update, saveAction, photos through uploadHeldFiles
- [x] Test: `tests/components/CnChecklistRunWidget.spec.js`

### Task 3: Questions and answers can live inside the open record
- **spec_ref**: `openspec/changes/checklist-run-widget/specs/checklist-run-widget/spec.md#requirement-questions-and-answers-can-live-inside-the-open-record`
- **files**: `src/components/CnChecklistRunWidget/CnChecklistRunWidget.vue`, `docs/components/cn-checklist-run-widget.md`
- [x] Implement: `questionsPath` / `itemsKey`, `typeMap`, `choiceValues`, `answersPath` written with one record update, photos to the record's files
- [x] Test: `tests/components/CnChecklistRunWidget.spec.js`

