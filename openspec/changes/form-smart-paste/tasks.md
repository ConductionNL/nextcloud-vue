# Tasks: form-smart-paste

> Sibling half of buildiq `ai-smart-paste-into-forms` (REQ-BQSP-003).
> Row `ai-smart-paste` (buildiq). `kind: code`.
> Checkbox budget: 4 tasks x 2 = 8 unindented `- [ ]` lines (cap 20).

## Implementation tasks

### Task 1: `config.smartPaste` in the schemas and the validator
- **spec_ref**: `openspec/changes/form-smart-paste/specs/manifest-form-logic/spec.md#requirement-form-pages-declare-smart-paste-in-the-manifest`
- **files**: `src/schemas/app-manifest-v2.schema.json`, `src/schemas/app-manifest.schema.json`, `src/utils/validateManifest.js`, `tests/utils/validateManifestSmartPaste.spec.js`
- **acceptance_criteria**:
  - An unknown field key, `enabled` without `handler`, and `enabled` in `public` mode each fail with the path
  - Existing form fixtures still validate
  - Verify: jest; `npm run build:validators` leaves no diff
- [x] Implement
- [x] Test

### Task 2: When the control shows
- **spec_ref**: `openspec/changes/form-smart-paste/specs/manifest-form-logic/spec.md#requirement-the-paste-control-shows-only-where-it-may-be-used`
- **files**: `src/components/CnFormPage/CnFormPage.vue`, `tests/components/CnFormPageSmartPasteGate.spec.js`
- **acceptance_criteria**:
  - Hidden in `public` mode, with a missing handler, with a throwing or false `available()`; shown otherwise
  - Verify: jest; mutation check: dropping the `public` check reddens the public test
- [x] Implement
- [x] Test

### Task 3: The dialog and the landing rules
- **spec_ref**: `openspec/changes/form-smart-paste/specs/manifest-form-logic/spec.md#requirement-pasted-text-fills-only-allowed-empty-visible-fields-as-suggestions`
- **files**: `src/dialogs/CnSmartPasteDialog.vue`, `src/components/CnFormPage/CnFormPage.vue`, `tests/components/CnFormPageSmartPaste.spec.js`, `tests/a11y/CnSmartPasteDialog.a11y.spec.js`
- **acceptance_criteria**:
  - The handler receives the text and the allowed fields only, never other values
  - Empty, visible, allowed fields fill; typed values stay unless Replace is ticked; type mismatches and validation failures are skipped and counted; marks clear on edit, Accept and Accept all; no submit happens
  - Verify: jest with a stub handler asserting its arguments; `npm run check:a11y`
- [x] Implement
- [x] Test (jest; `npm run check:a11y` not run)

### Task 4: Docs and an end-to-end run
- **spec_ref**: `openspec/changes/form-smart-paste/specs/manifest-form-logic/spec.md#requirement-pasted-text-fills-only-allowed-empty-visible-fields-as-suggestions`
- **files**: `docs/components/cn-form-page.md`, `e2e/form-smart-paste.e2e.js`
- **acceptance_criteria**:
  - Docs show the manifest block and the handler contract
  - A harness form with a registered stub handler fills three fields as suggestions and submits only on Submit
  - Verify: `npm run check:docs`, `npm run check:docs-fresh`; `npm run test:e2e -- form-smart-paste`
- [x] Implement
- [ ] Test — not run: needs the harness and `npm run test:e2e`
