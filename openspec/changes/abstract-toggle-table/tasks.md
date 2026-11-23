# Tasks: abstract-toggle-table

### Task 1: Rows
- **spec_ref**: `openspec/changes/abstract-toggle-table/specs/toggle-table/spec.md#requirement-a-toggle-table-draws-rows-from-a-list-or-a-source`
- **files**: `src/components/CnToggleTableWidget/CnToggleTableWidget.vue`, `src/components/CnToggleTableWidget/index.js`
- [x] Implement: static rows, source, extra columns, flag and list mode, invert, empty text
- [x] Test: `tests/components/CnToggleTableWidget.spec.js`; e2e `e2e/settings-widgets.e2e.js`

### Task 2: A toggle saves one field
- **spec_ref**: `openspec/changes/abstract-toggle-table/specs/toggle-table/spec.md#requirement-a-toggle-saves-one-field`
- [x] Implement: one-field PATCH, busy, refusal, readOnly
- [x] Test: unit spec and e2e

### Task 3: Registration and docs
- [x] Catalog registration (content-only, detail page), exports, `docs/components/cn-toggle-table-widget.md`
