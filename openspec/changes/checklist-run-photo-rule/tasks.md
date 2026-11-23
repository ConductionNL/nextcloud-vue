# Tasks: checklist-run-photo-rule

### Task 1: A question can require a photo
- **spec_ref**: `openspec/changes/checklist-run-photo-rule/specs/checklist-run-photo-rule/spec.md#requirement-a-question-can-require-a-photo`
- **files**: `src/components/CnChecklistRunWidget/CnChecklistRunWidget.vue`, `docs/components/cn-checklist-run-widget.md`
- [x] Implement: `photoRequired` rule, a photo control per question, Next holds the page
- [x] Test: `tests/components/CnChecklistRunWidget.spec.js`

### Task 2: A checklist run can pick its record by filter
- **spec_ref**: `openspec/changes/checklist-run-photo-rule/specs/checklist-run-photo-rule/spec.md#requirement-a-checklist-run-can-pick-its-record-by-filter`
- **files**: `src/components/CnChecklistRunWidget/CnChecklistRunWidget.vue`
- [x] Implement: `record.filter` / `record.sort`, first match, empty state
- [x] Test: `tests/components/CnChecklistRunWidget.spec.js`
