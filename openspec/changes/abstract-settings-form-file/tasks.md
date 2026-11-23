# Tasks: abstract-settings-form-file

### Task 1: File field
- **spec_ref**: `openspec/changes/abstract-settings-form-file/specs/settings-form/spec.md#requirement-a-file-field-takes-a-file-from-the-nextcloud-picker`
- **files**: `src/components/CnSettingsFormWidget/CnSettingsFormWidget.vue`
- [x] Implement: file type, picker, mime filter, start folder, value template, closed and failed picker
- [x] Test: `tests/components/CnSettingsFormFile.spec.js`; e2e `e2e/settings-widgets.e2e.js` (the picker dialog itself — not run: it needs a Nextcloud server)

### Task 2: Remove
- **spec_ref**: `openspec/changes/abstract-settings-form-file/specs/settings-form/spec.md#requirement-a-file-field-can-be-emptied`
- [x] Implement: remove button, null on save
- [x] Test: unit spec and e2e

### Task 3: Docs
- [x] `docs/components/cn-settings-form-widget.md` file field rows
