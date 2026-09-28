# Tasks: form-file-and-camera-fields

> Rows `form-file-upload` and `form-camera-capture` (buildiq), with the humaniq and buildiq halves. `kind: code`.
> Checkbox budget: 5 tasks x 2 = 10 unindented `- [ ]` lines (cap 20).

## Implementation tasks

### Task 1: File properties in the dialog
- **spec_ref**: `openspec/changes/form-file-and-camera-fields/specs/dialog-system/spec.md#requirement-the-schema-driven-dialog-renders-file-properties`
- **files**: `src/utils/schema.js`, `src/components/CnFormDialog/CnFormDialog.vue`, `tests/utils/schemaFileWidget.spec.js`, `tests/components/CnFormDialogFile.spec.js`
- **acceptance_criteria**:
  - `type: "file"` and arrays of files map to the file widget with `accept` and `maxSize` from the property
  - Verify: jest
- [ ] Implement
- [ ] Test

### Task 2: Several files and drop
- **spec_ref**: `openspec/changes/form-file-and-camera-fields/specs/dialog-system/spec.md#requirement-a-file-field-takes-several-files-and-dropped-files`
- **files**: `src/components/CnFileField/CnFileField.vue`, `src/composables/cnFormFieldRenderer.js`, `tests/components/CnFileFieldMultiple.spec.js`
- **acceptance_criteria**:
  - `multiple` keeps a list with remove; a drop adds files; the drop area is also a button
  - Verify: jest; `npm run check:a11y`
- [ ] Implement
- [ ] Test

### Task 3: Upload after save
- **spec_ref**: `openspec/changes/form-file-and-camera-fields/specs/dialog-system/spec.md#requirement-files-over-the-inline-cap-are-uploaded-after-save`
- **files**: `src/components/CnFileField/CnFileField.vue`, `src/components/CnFormDialog/CnFormDialog.vue`, `src/components/CnFormPage/CnFormPage.vue`, `src/composables/useHeldFileUpload.js`, `tests/composables/useHeldFileUpload.spec.js`
- **acceptance_criteria**:
  - Under the cap: inline as today; over: held, uploaded to `filesMultipart` after save, reference written on the property
  - A failed upload keeps the object, names the file and offers Retry
  - First confirm against OpenRegister that a file object naming an attached file keeps it on the property (see proposal); record the answer in this task
  - Verify: jest with mocked axios; mutation check: uploading before save reddens the create test
- [ ] Implement
- [ ] Test

### Task 4: Camera capture
- **spec_ref**: `openspec/changes/form-file-and-camera-fields/specs/dialog-system/spec.md#requirement-a-field-can-take-a-photo-from-the-camera`
- **files**: `src/components/CnCameraCapture/`, `src/components/CnFileField/CnFileField.vue`, `tests/components/CnCameraCapture.spec.js`, `e2e/file-field-camera.e2e.js`
- **acceptance_criteria**:
  - `capture` sets the input attribute and `accept="image/*"` unless narrowed
  - Take photo starts the stream only on press and stops every track on close and on error
  - Verify: jest with a fake `getUserMedia`; Playwright with Chromium's fake camera flags on the harness
- [ ] Implement
- [ ] Test

### Task 5: Manifest keys and docs
- **spec_ref**: `openspec/changes/form-file-and-camera-fields/specs/dialog-system/spec.md#requirement-a-field-can-take-a-photo-from-the-camera`
- **files**: `src/schemas/app-manifest-v2.schema.json`, `tests/schemas/formFieldFile.spec.js`, `docs/components/cn-file-field.md`, `docs/components/cn-camera-capture.md`
- **acceptance_criteria**:
  - The v2 schema accepts `multiple` and `capture` on a file field
  - Docs describe the inline cap, the upload after save and the camera
  - Verify: `npm run build:validators`, `npm run check:docs`, `npm run check:docs-fresh`
- [ ] Implement
- [ ] Test
