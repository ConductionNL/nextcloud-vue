# Tasks: abstract-field-list

### Task 1: Rows
- **spec_ref**: `openspec/changes/abstract-field-list/specs/field-list/spec.md#requirement-a-field-list-draws-the-entries-of-one-object-field`
- **files**: `src/components/CnFieldListWidget/CnFieldListWidget.vue`, `src/components/CnFieldListWidget/index.js`
- [x] Implement: title, initials, meta, pill, aside, detail, rowSource merge, empty text
- [x] Test: `tests/components/CnFieldListWidget.spec.js`; e2e `e2e/field-list.e2e.js`

### Task 2: One-field PATCH
- **spec_ref**: `openspec/changes/abstract-field-list/specs/field-list/spec.md#requirement-a-field-list-saves-one-field-with-one-patch`
- [x] Implement: re-read, apply to stored list, PATCH one field, server message on refusal
- [x] Test: unit spec

### Task 3: Add and remove
- **spec_ref**: `openspec/changes/abstract-field-list/specs/field-list/spec.md#requirement-a-field-list-adds-and-removes-entries`
- [x] Implement: required, pattern, unique, defaults, remove, readOnly
- [x] Test: unit spec

### Task 4: Row actions
- **spec_ref**: `openspec/changes/abstract-field-list/specs/field-list/spec.md#requirement-a-field-list-row-can-run-a-configured-request`
- [x] Implement: when, token resolution, request, live re-read, notes
- [x] Test: unit spec

### Task 5: Registration and docs
- [x] Catalog registration (content-only, detail page), exports, `docs/components/cn-field-list-widget.md`
