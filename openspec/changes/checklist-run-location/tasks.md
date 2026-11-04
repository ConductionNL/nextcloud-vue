# Tasks: checklist-run-location

### Task 1: A field captures where something was recorded
- **spec_ref**: `openspec/changes/checklist-run-location/specs/checklist-run-location/spec.md#requirement-a-field-captures-where-something-was-recorded`
- **files**: `src/components/CnGeoCaptureField/CnGeoCaptureField.vue`, `src/components/CnGeoCaptureField/index.js`, `src/utils/captureLocation.js`, `src/components/index.js`, `src/index.js`, `docs/components/cn-geo-capture-field.md`, `docs/components/index.md`, `l10n/en.json`, `l10n/nl.json`
- [x] Implement: `CnGeoCaptureField`, `captureLocation`
- [x] Test: `tests/components/CnGeoCaptureField.spec.js`

### Task 2: An answer carries where it was given
- **spec_ref**: `openspec/changes/checklist-run-location/specs/checklist-run-location/spec.md#requirement-an-answer-carries-where-it-was-given`
- **files**: `src/components/CnChecklistRunWidget/CnChecklistRunWidget.vue`, `docs/components/cn-checklist-run-widget.md`
- [x] Implement: `content.captureLocation`
- [x] Test: `tests/components/CnChecklistRunWidgetLocation.spec.js`
