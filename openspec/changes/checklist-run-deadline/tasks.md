# Tasks: checklist-run-deadline

### Task 1: The time left follows the record's deadline
- **spec_ref**: `openspec/changes/checklist-run-deadline/specs/checklist-run-deadline/spec.md#requirement-the-time-left-follows-the-record-s-deadline`
- **files**: `src/components/CnChecklistRunWidget/CnChecklistRunWidget.vue`, `docs/components/cn-checklist-run-widget.md`, `l10n/en.json`, `l10n/nl.json`
- [x] Implement: `deadlineField`, `serverNowField`, `timeLeftText`, `timeWarningSeconds`
- [x] Test: `tests/components/CnChecklistRunWidgetDeadline.spec.js`

### Task 2: The saved line and the submit button
- **spec_ref**: `openspec/changes/checklist-run-deadline/specs/checklist-run-deadline/spec.md#requirement-a-button-finishes-from-any-page`
- **files**: `src/components/CnChecklistRunWidget/CnChecklistRunWidget.vue`
- [x] Implement: `savedText`, `submitLabel`
- [x] Test: `tests/components/CnChecklistRunWidgetDeadline.spec.js`
