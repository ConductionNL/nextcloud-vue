# Tasks: abstract-choice-picker

### Task 1: Cards
- **spec_ref**: `openspec/changes/abstract-choice-picker/specs/choice-picker/spec.md#requirement-a-choice-picker-draws-cards-from-a-source-with-swatches-and-a-state-pill`
- **files**: `src/components/CnChoicePickerWidget/CnChoicePickerWidget.vue`, `src/components/CnChoicePickerWidget/index.js`
- [x] Implement: source, items, swatches, state pill, refusal, translation
- [x] Test: `tests/components/CnChoicePickerWidget.spec.js`; e2e `e2e/settings-widgets.e2e.js`

### Task 2: Confirm with warning
- **spec_ref**: `openspec/changes/abstract-choice-picker/specs/choice-picker/spec.md#requirement-a-risky-choice-is-saved-only-on-purpose`
- [x] Implement: warning band, confirm button, `@confirmed`, custom request or field PATCH, server message
- [x] Test: unit spec and e2e

### Task 3: Registration and docs
- [x] Catalog registration (content-only, detail page), exports, `docs/components/cn-choice-picker-widget.md`
