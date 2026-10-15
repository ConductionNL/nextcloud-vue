# Tasks: screens-board-reference-columns

### Task 1: Columns from a referenced field
- **spec_ref**: `openspec/changes/screens-board-reference-columns/specs/board-view/spec.md#requirement-columns-can-be-the-rows-a-field-references`
- **files**: `src/utils/boardReferenceColumns.js`, `src/utils/boardColumns.js`, `src/components/CnIndexPage/CnIndexPage.vue`
- [x] Implement: `columnFields[].source`, fetch once per field, order, merge, narrow
- [x] Test: `tests/utils/boardReferenceColumns.spec.js`, `tests/components/CnIndexPageBoardReferenceColumns.spec.js`; e2e `e2e/l13-board-reference-columns.e2e.js` (`?l8=board-reference`)

### Task 2: The column switch, the narrowing select and the hint
- **spec_ref**: `openspec/changes/screens-board-reference-columns/specs/board-view/spec.md#requirement-a-board-can-switch-the-field-its-columns-come-from`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue`, `src/css/index-page.css`
- [x] Implement: `columnSwitchLabel`, `narrow`, `hint`, event `board-column-field-change`
- [x] Test: component spec and e2e as above

### Task 3: A field without a referenced schema
- **spec_ref**: `openspec/changes/screens-board-reference-columns/specs/board-view/spec.md#requirement-a-field-without-a-referenced-schema-takes-its-values`
- [x] Implement: `kind: "values"`, `valueLabels`, `emptyLabel`
- [x] Test: unit and e2e as above

### Task 4: A drop writes the reference
- **spec_ref**: `openspec/changes/screens-board-reference-columns/specs/board-view/spec.md#requirement-a-drop-writes-the-reference`
- [x] Implement: `moveHandler` (registry), PATCH fallback, `readOnly`, refusal for a column the card's parent has no row for
- [x] Test: unit and e2e as above

### Task 5: Where a card can go
- **spec_ref**: `openspec/changes/screens-board-reference-columns/specs/board-view/spec.md#requirement-the-board-shows-where-a-card-can-go`
- **files**: `src/components/CnBoardView/CnBoardView.vue`, `src/css/board.css`, `l10n/nl.json`
- [x] Implement: `moveTargetsHandler`, `allowedMoves` prop, fade, "not allowed", local refusal
- [x] Test: component spec, `tests/l10n/boardDutch.spec.js`, e2e as above

### Task 6: Selecting cards and wrapping columns
- **spec_ref**: `openspec/changes/screens-board-reference-columns/specs/board-view/spec.md#requirement-cards-can-be-selected-for-bulk-actions`
- [x] Implement: `selectable` / `selectedIds` / `select`, `wrap`
- [x] Test: component spec and e2e as above

### Task 7: Schema
- **files**: `src/schemas/app-manifest-v2.schema.json`, `tests/schemas/app-manifest-v2.schema.spec.js`
- [x] Implement: boardView keys, `config.board` typed on index pages, version 2.97.0, hash
- [x] Test: `tests/schemas/app-manifest-v2.schema.spec.js`
