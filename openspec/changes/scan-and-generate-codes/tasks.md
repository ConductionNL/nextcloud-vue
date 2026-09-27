# Tasks: scan-and-generate-codes

> Sibling half of buildiq `pages-qr-and-barcodes` (REQ-BQQR-001 to
> REQ-BQQR-003). Rows `pg-scan-code`, `pg-generate-code` (buildiq).
> `kind: code`.
> Checkbox budget: 7 tasks x 2 = 14 unindented `- [ ]` lines (cap 20).

## Implementation tasks

### Task 1: The dependency and its bundle rules
- **spec_ref**: `openspec/changes/scan-and-generate-codes/specs/index-page/spec.md#requirement-a-scanner-reads-qr-codes-and-barcodes-and-always-accepts-typing`
- **files**: `package.json`, `rollup.config.js`, `rollup.config.vue3.mjs`
- **acceptance_criteria**:
  - `@zxing/library` in `dependencies` only, external in both configs beside `@toast-ui/`
  - `dist/` holds no copy of it and no top-level import of it
  - Verify: `npm run build`, then `npm run check:bundled-peers` and `npm run check:dist-sideeffects`
- [ ] Implement
- [ ] Test

### Task 2: Camera stream and decoder
- **spec_ref**: `openspec/changes/scan-and-generate-codes/specs/index-page/spec.md#requirement-a-scanner-reads-qr-codes-and-barcodes-and-always-accepts-typing`
- **files**: `src/composables/useCameraStream.js`, `src/composables/useCodeDecoder.js`, `tests/composables/useCameraStream.spec.js`, `tests/composables/useCodeDecoder.spec.js`
- **acceptance_criteria**:
  - The stream starts on request and every track stops on `stop()` and scope dispose
  - The decoder uses `BarcodeDetector` when it lists the three formats, else imports `@zxing/library`; fixture images of each format decode
  - Verify: jest with a `getUserMedia` fake and image fixtures; mutation check: skipping the track stop on dispose reddens the release test
- [ ] Implement
- [ ] Test

### Task 3: `CnCodeScannerDialog`
- **spec_ref**: `openspec/changes/scan-and-generate-codes/specs/index-page/spec.md#requirement-a-scanner-reads-qr-codes-and-barcodes-and-always-accepts-typing`
- **files**: `src/dialogs/CnCodeScannerDialog.vue`, `src/index.js`, `tests/dialogs/CnCodeScannerDialog.spec.js`, `tests/a11y/CnCodeScannerDialog.a11y.spec.js`
- **acceptance_criteria**:
  - Emits `detected` from the decoder and from Enter in the input; a refusal shows the message and keeps the input
  - Verify: jest; `npm run check:a11y`
- [ ] Implement
- [ ] Test

### Task 4: The scan action and lookup on the index page
- **spec_ref**: `openspec/changes/scan-and-generate-codes/specs/index-page/spec.md#requirement-an-index-page-opens-or-filters-by-a-scanned-value`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue`, `src/components/CnActionsBar/CnActionsBar.vue`, `src/schemas/app-manifest-v2.schema.json`, `tests/components/CnIndexPageScan.spec.js`
- **acceptance_criteria**:
  - No button without `config.scan.enabled`; the lookup request carries the field and `_limit=2` and leaves the list untouched
  - Zero, one with `open`, and several matches behave as specified
  - Verify: jest asserting the request and the emitted row click; `npm run build:validators` leaves no diff
- [ ] Implement
- [ ] Test

### Task 5: `CnScanField`
- **spec_ref**: `openspec/changes/scan-and-generate-codes/specs/manifest-form-logic/spec.md#requirement-a-scan-field-fills-a-text-value-from-the-scanner`
- **files**: `src/components/CnScanField/`, `src/composables/cnFormFieldRenderer.js`, `src/schemas/app-manifest.schema.json`, `src/utils/validateManifest.js`, `tests/components/CnScanField.spec.js`
- **acceptance_criteria**:
  - `scan` validates on form pages with `formats`; the field types and scans into the same value
  - Verify: jest
- [ ] Implement
- [ ] Test

### Task 6: Encoders and the `code` widget
- **spec_ref**: `openspec/changes/scan-and-generate-codes/specs/grid-widget-system/spec.md#requirement-a-code-widget-draws-a-qr-code-or-barcode-for-the-record`
- **files**: `src/utils/barcodeEncode.js`, `src/components/CnObjectCodeWidget/`, `src/components/CnWidgetGrid/registerDashboardWidgets.js`, `tests/utils/barcodeEncode.spec.js`, `tests/components/CnObjectCodeWidget.spec.js`
- **acceptance_criteria**:
  - EAN-13 and Code 128 bar patterns match reference vectors; a drawn code decodes back to its value through `useCodeDecoder`
  - The widget registers as `code` for the detail page, draws from a field and from the address, explains an invalid value, and downloads SVG
  - Verify: jest; mutation check: a wrong EAN-13 check digit reddens the reference test
- [ ] Implement
- [ ] Test

### Task 7: Docs and an end-to-end run
- **spec_ref**: `openspec/changes/scan-and-generate-codes/specs/index-page/spec.md#requirement-an-index-page-opens-or-filters-by-a-scanned-value`
- **files**: `docs/components/cn-code-scanner-dialog.md`, `docs/components/cn-scan-field.md`, `docs/components/cn-object-code-widget.md`, `docs/components/cn-index-page.md`, `e2e/scan-and-codes.e2e.js`
- **acceptance_criteria**:
  - A harness index page with a fake camera stream showing a QR code opens the record; a detail page renders the code widget
  - Verify: `npm run check:docs`, `npm run check:docs-fresh`; `npm run test:e2e -- scan-and-codes`
- [ ] Implement
- [ ] Test
