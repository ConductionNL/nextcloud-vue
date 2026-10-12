# Tasks: abstract-radio-cards

### Task 1: Cards
- **spec_ref**: `openspec/changes/abstract-radio-cards/specs/radio-cards/spec.md#requirement-radio-cards-draw-one-card-per-configured-option`
- **files**: `src/components/CnRadioCardsWidget/CnRadioCardsWidget.vue`, `src/components/CnRadioCardsWidget/index.js`
- [x] Implement: cards, real radio inputs, title, description, columns, translation
- [x] Test: `tests/components/CnRadioCardsWidget.spec.js`; e2e `e2e/settings-widgets.e2e.js`

### Task 2: Choosing saves one field
- **spec_ref**: `openspec/changes/abstract-radio-cards/specs/radio-cards/spec.md#requirement-choosing-a-card-saves-that-one-field`
- [x] Implement: one-field PATCH, busy, revert and server message, readOnly
- [x] Test: unit spec and e2e

### Task 3: Registration and docs
- [x] Catalog registration (content-only, detail page), exports, `docs/components/cn-radio-cards-widget.md`
