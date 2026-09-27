# Tasks: index-column-order-and-pinning

> Row `data-user-column-settings` (buildiq). `kind: code`.
> Checkbox budget: 5 tasks x 2 = 10 unindented `- [ ]` lines (cap 20).

## Implementation tasks

### Task 1: Order in the list model
- **spec_ref**: `openspec/changes/index-column-order-and-pinning/specs/index-page/spec.md#requirement-a-user-orders-the-columns-of-a-list`
- **files**: `src/composables/useListView.js`, `src/components/CnIndexPage/CnIndexPage.vue`, `tests/composables/useListViewColumnOrder.spec.js`
- **acceptance_criteria**:
  - The visible list is ordered and `CnDataTable` renders in that order
  - A column the schema dropped is removed on read; a new one is appended hidden
  - Verify: jest
- [ ] Implement
- [ ] Test

### Task 2: Move and pin in the Columns tab
- **spec_ref**: `openspec/changes/index-column-order-and-pinning/specs/index-page/spec.md#requirement-a-user-orders-the-columns-of-a-list`
- **files**: `src/components/CnIndexSidebar/CnIndexSidebar.vue`, `tests/components/CnIndexSidebarColumnOrder.spec.js`
- **acceptance_criteria**:
  - Handle, Move up, Move down and Pin per visible column; drag and buttons call one method
  - Buttons carry labels naming the column; Pin carries `aria-pressed`
  - Verify: jest; `npm run check:a11y`
- [ ] Implement
- [ ] Test

### Task 3: Sticky pinned columns
- **spec_ref**: `openspec/changes/index-column-order-and-pinning/specs/index-page/spec.md#requirement-a-user-pins-columns-to-the-start-of-the-table`
- **files**: `src/components/CnDataTable/CnDataTable.vue`, `e2e/data-table-pinned-columns.e2e.js`
- **acceptance_criteria**:
  - `pinnedCount` makes the first columns and the selection column sticky with summed offsets
  - Verify: Playwright on the harness scrolls a wide table and asserts the pinned cells' bounding boxes do not move (jsdom computes no layout)
- [ ] Implement
- [ ] Test

### Task 4: Store and restore per user
- **spec_ref**: `openspec/changes/index-column-order-and-pinning/specs/index-page/spec.md#requirement-the-column-layout-is-kept-per-user-and-per-list`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue`, `tests/components/CnIndexPageColumnPreference.spec.js`
- **acceptance_criteria**:
  - Writes `columns.<list id>` through `cnUserPreferences`; reads it on mount
  - A saved view with columns wins while applied; Reset deletes the preference
  - `personalColumns: false` writes nothing
  - Verify: jest with a fake preferences store; mutation check: skipping the view precedence reddens the saved-view test
- [ ] Implement
- [ ] Test

### Task 5: Manifest key and docs
- **spec_ref**: `openspec/changes/index-column-order-and-pinning/specs/index-page/spec.md#requirement-the-column-layout-is-kept-per-user-and-per-list`
- **files**: `src/schemas/app-manifest-v2.schema.json`, `tests/schemas/personalColumns.spec.js`, `docs/components/cn-index-sidebar.md`, `docs/components/cn-data-table.md`
- **acceptance_criteria**:
  - The v2 schema accepts `personalColumns` as a boolean
  - Docs describe order, pin, reset and the precedence
  - Verify: `npm run build:validators`, `npm run check:docs`, `npm run check:docs-fresh`
- [ ] Implement
- [ ] Test
