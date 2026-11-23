# Tasks: board-column-capacity

### Task 1: A column carries a capacity
- **spec_ref**: `openspec/changes/board-column-capacity/specs/board-view/spec.md#requirement-a-column-can-carry-a-capacity`
- **files**: `src/utils/boardColumns.js`, `src/utils/boardReferenceColumns.js`, `src/components/CnIndexPage/CnIndexPage.vue`, `src/components/CnBoardView/CnBoardView.vue`, `src/css/board.css`, `src/schemas/app-manifest-v2.schema.json`
- [x] Implement: `source.capacityField`, state `capacity`, merged column without a limit, "count / capacity" header, full style, schema 2.100.0
- [x] Test: `tests/utils/boardColumnCapacity.spec.js`, `tests/components/CnBoardColumnCapacity.spec.js`, `tests/schemas/app-manifest-v2.schema.spec.js`; e2e `e2e/l17-board-column-capacity.e2e.js` (`?l8=board-capacity`)

### Task 2: A drop into a full column is refused
- **spec_ref**: `openspec/changes/board-column-capacity/specs/board-view/spec.md#requirement-a-drop-into-a-full-column-is-refused`
- **files**: `src/components/CnBoardView/CnBoardView.vue`, `src/components/CnIndexPage/CnIndexPage.vue`, `src/utils/boardReferenceColumns.js`, `l10n/nl.json`
- [x] Implement: refusal on drag, menu and select; fade during a drag; "full" in the menu; per-row check before the handler or PATCH
- [x] Test: component spec, `tests/l10n/boardDutch.spec.js`, e2e as above
