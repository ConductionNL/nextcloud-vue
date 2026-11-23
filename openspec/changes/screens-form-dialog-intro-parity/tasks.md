# Tasks: screens-form-dialog-intro-parity

## Implementation Tasks

### Task 1: An open-form action names the dialog's eyebrow and intro
- **spec_ref**: `openspec/changes/screens-form-dialog-intro-parity/specs/form-dialog-intro/spec.md#requirement-an-open-form-action-names-the-dialogs-eyebrow-and-intro`
- **files**: `src/schemas/app-manifest-v2.schema.json`, `src/components/CnActionButtons/CnActionButtons.vue`, `tests/components/CnActionButtons.spec.js`, `tests/schemas/app-manifest-v2.schema.spec.js`
- [x] Implement: `formEyebrow` and `formSubtitle` in `$defs/action` (schema 2.84.0); forwarded through `tr()` as `eyebrow` and `subtitle`
- [x] Test: forwarded with values, empty without; a manifest with both keys validates

### Task 2: Live check
- [ ] Open the new case dialog on :8080 after a release (not run: the apps run the released package)
