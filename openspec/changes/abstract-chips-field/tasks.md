# Tasks: abstract-chips-field

### Task 1: Chips
- **spec_ref**: `openspec/changes/abstract-chips-field/specs/chips-field/spec.md#requirement-a-chips-field-draws-one-chip-per-stored-string`
- **files**: `src/components/CnChipsFieldWidget/CnChipsFieldWidget.vue`, `src/components/CnChipsFieldWidget/index.js`
- [x] Implement: chips, remove, add chip, options, readOnly, translation
- [x] Test: `tests/components/CnChipsFieldWidget.spec.js`; e2e `e2e/settings-widgets.e2e.js`

### Task 2: Check before add
- **spec_ref**: `openspec/changes/abstract-chips-field/specs/chips-field/spec.md#requirement-an-entry-is-checked-before-it-is-added`
- [x] Implement: trim, lowercase, empty, pattern, duplicate
- [x] Test: unit spec and e2e

### Task 3: One PATCH
- **spec_ref**: `openspec/changes/abstract-chips-field/specs/chips-field/spec.md#requirement-add-and-remove-save-the-full-list-in-one-patch`
- [x] Implement: full-list PATCH of one field, server message on refusal
- [x] Test: unit spec and e2e

### Task 4: Registration and docs
- [x] Catalog registration (content-only, detail page), exports, `docs/components/cn-chips-field-widget.md`
