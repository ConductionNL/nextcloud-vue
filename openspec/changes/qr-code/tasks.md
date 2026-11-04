# Tasks: qr-code

### Task 1: The drawn code says the value
- **spec_ref**: `openspec/changes/qr-code/specs/qr-code/spec.md#requirement-the-drawn-code-says-the-value`
- **files**: `src/utils/qr.js`, `src/components/CnQrCode/CnQrCode.vue`, `src/components/CnQrCode/index.js`, `src/components/index.js`, `src/index.js`, `docs/components/cn-qr-code.md`, `docs/components/index.md`, `l10n/en.json`, `l10n/nl.json`
- [x] Implement: `encodeQr`, `CnQrCode`
- [x] Test: `tests/utils/qr.spec.js`, `tests/components/CnQrCode.spec.js`

### Task 2: A code changes on a timer
- **spec_ref**: `openspec/changes/qr-code/specs/qr-code/spec.md#requirement-a-code-changes-on-a-timer`
- **files**: `src/components/CnQrCode/CnQrCode.vue`
- [x] Implement: `refreshUrl`, `refreshSeconds`, `mapResponse`, the countdown and the failure notice
- [x] Test: `tests/components/CnQrCode.spec.js`
