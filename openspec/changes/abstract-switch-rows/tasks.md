# Tasks: abstract-switch-rows

### Task 1: Rows
- **spec_ref**: `openspec/changes/abstract-switch-rows/specs/switch-rows/spec.md#requirement-switch-rows-draw-one-switch-per-configured-boolean-field`
- **files**: `src/components/CnSwitchRowsWidget/CnSwitchRowsWidget.vue`, `src/components/CnSwitchRowsWidget/index.js`
- [x] Implement: switch, label, hint, invert, translation
- [x] Test: `tests/components/CnSwitchRowsWidget.spec.js`; e2e `e2e/settings-widgets.e2e.js`

### Task 2: Toggle saves one field
- **spec_ref**: `openspec/changes/abstract-switch-rows/specs/switch-rows/spec.md#requirement-a-toggle-saves-that-one-field`
- [x] Implement: one-field PATCH, busy, revert and server message, readOnly
- [x] Test: unit spec and e2e

### Task 3: Registration and docs
- [x] Catalog registration (content-only, detail page), exports, `docs/components/cn-switch-rows-widget.md`
