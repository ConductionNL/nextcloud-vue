# Tasks: abstract-settings-form

### Task 1: Draw the fields
- **spec_ref**: `openspec/changes/abstract-settings-form/specs/settings-form/spec.md#requirement-a-settings-form-draws-the-configured-fields-of-the-current-object`
- **files**: `src/components/CnSettingsFormWidget/CnSettingsFormWidget.vue`, `src/components/CnSettingsFormWidget/index.js`
- [x] Implement: five field types, grid, labels, hints, translation
- [x] Test: `tests/components/CnSettingsFormWidget.spec.js`; e2e `e2e/settings-widgets.e2e.js`

### Task 2: Save only what changed
- **spec_ref**: `openspec/changes/abstract-settings-form/specs/settings-form/spec.md#requirement-a-settings-form-saves-only-what-changed`
- **files**: `src/utils/objectWrite.js`
- [x] Implement: baseline, changed fields, number and null handling, refusal note
- [x] Test: unit spec and e2e

### Task 3: Validate
- **spec_ref**: `openspec/changes/abstract-settings-form/specs/settings-form/spec.md#requirement-a-settings-form-validates-before-any-write`
- [x] Implement: required, min, max, pattern
- [x] Test: unit spec and e2e

### Task 4: Registration and docs
- [x] Catalog registration (content-only, detail page), exports, `docs/components/cn-settings-form-widget.md`
