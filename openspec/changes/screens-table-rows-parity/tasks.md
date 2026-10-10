# Tasks: screens-table-rows-parity

## Implementation Tasks

### Task 1: A row title can be plain text
- **spec_ref**: `openspec/changes/screens-table-rows-parity/specs/index-list-board-look/spec.md#requirement-a-row-title-can-be-plain-text`
- **files**: `src/components/CnDataTable/CnDataTable.vue`, `src/components/CnIndexPage/CnIndexPage.vue`, `src/css/look-board-index.css`, `src/schemas/app-manifest-v2.schema.json`
- [x] Implement: `rowTitle` prop on CnDataTable and CnIndexPage, `config.rowTitle` in the manifest schema (2.76.0), the plain title CSS
- [x] Test: container class per look and value, prop validator, CSS values (`tests/components/CnDataTableRowTitle.spec.js`, `tests/css/lookBoardTableRows.spec.js`)
- [ ] Browser check against PqTickets — not run: the app lanes own the browsers and :8080

### Task 2: The title link underlines the title only
- **spec_ref**: `openspec/changes/screens-table-rows-parity/specs/index-list-board-look/spec.md#requirement-the-title-link-underlines-the-title-only`
- **files**: `src/css/look-board-index.css`
- [x] Implement: the secondary lines as inline blocks
- [x] Test: CSS values (`tests/css/lookBoardTableRows.spec.js`)
- [ ] Browser check against DqZaken — not run: the app lanes own the browsers and :8080

### Task 3: The row menu keeps its board border under any theme
- **spec_ref**: `openspec/changes/screens-table-rows-parity/specs/index-list-board-look/spec.md#requirement-the-row-menu-keeps-its-board-border-under-any-theme`
- **files**: `src/css/look-board-index.css`
- [x] Implement: `!important` board values on the row menu button
- [x] Test: CSS values (`tests/css/lookBoardTableRows.spec.js`)
- [ ] Browser check under the nldesign theme — not run: the app lanes own the browsers and :8080

### Task 4: Documentation
- **files**: `docs/components/cn-data-table.md`, `docs/components/cn-index-page.md`
- [x] JSDoc on `rowTitle`; the key in the component docs
