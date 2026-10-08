# Tasks: screens-index-list-parity

> The DqZaken setup for `CnIndexPage` under the board look (ADR-032 `kind: code`).
> Checkbox budget: 7 tasks x 2 = 14 unindented `- [ ]` lines (cap 20).
> Every task: `npm test` and `npm run build` green, JSDoc on new props, the
> component reference doc updated, and a unit test with @vue/test-utils.
> Depends on `screens-chrome-parity` task 1 (the look switch).

## Implementation tasks

### Task 1: The header rows and button order
- **spec_ref**: `openspec/changes/screens-index-list-parity/specs/index-list-board-look/spec.md#requirement-the-index-header-reads-title-count-and-the-board-buttons`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue`, `src/components/CnPageHeader/CnPageHeader.vue`, `src/schemas/app-manifest-v2.schema.json`, `tests/components/CnIndexPageBoardLookHeader.spec.js`
- **acceptance_criteria**:
  - `actions-menu` validates and renders only when header actions exist
  - Order export, actions-menu, other secondary, buildiq, primary regardless of the declared order
  - `countText` fills `{shown}` and `{total}`
- [ ] Implement
- [ ] Test

### Task 2: The two-row toolbar and the Filter button
- **spec_ref**: `openspec/changes/screens-index-list-parity/specs/index-list-board-look/spec.md#requirement-the-toolbar-sits-on-the-ground-in-two-rows`
- **files**: `src/components/CnActionsBar/CnActionsBar.vue`, `src/css/actions-bar.css`, `src/css/look-board.css`, `src/components/CnIndexPage/CnIndexPage.vue`, `tests/components/CnActionsBarBoardLayout.spec.js`
- **acceptance_criteria**:
  - No band under the look; row 2 always renders the search field
  - Filter is labelled, opens the facet sidebar and shows the active count
  - Active filter chips remove their own filter; "Clear all" clears every one
- [ ] Implement
- [ ] Test

### Task 3: Saved-view chips
- **spec_ref**: `openspec/changes/screens-index-list-parity/specs/index-list-board-look/spec.md#requirement-saved-views-are-chips-with-a-count`
- **files**: `src/components/CnSavedViewsControl/CnSavedViewsControl.vue`, `src/components/CnQuickFilterBar/CnQuickFilterBar.vue`, `src/css/look-board.css`, `tests/components/CnSavedViewsChips.spec.js`
- **acceptance_criteria**:
  - 38px chips with `aria-pressed`, the selected one filled with the main text colour
  - Badge colours per state; no badge without a count
  - Rename, share and delete stay reachable from the Save view menu
- [ ] Implement
- [ ] Test

### Task 4: The view switch
- **spec_ref**: `openspec/changes/screens-index-list-parity/specs/index-list-board-look/spec.md#requirement-the-view-switch-is-four-icon-segments-in-a-fixed-order`
- **files**: `src/components/CnActionsBar/CnActionsBar.vue`, `src/css/look-board.css`, `tests/components/CnActionsBarViewSwitchBoard.spec.js`
- **acceptance_criteria**:
  - Order table, cards, board, map; only offered modes render
  - Icon-only 40px by 34px segments with accessible names; no thumb under the look
- [ ] Implement
- [ ] Test

### Task 5: The bulk band
- **spec_ref**: `openspec/changes/screens-index-list-parity/specs/index-list-board-look/spec.md#requirement-the-bulk-band-is-its-own-row`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue`, `src/components/CnActionsBar/CnActionsBar.vue`, `src/components/CnMassActionBar/CnMassActionBar.vue`, `tests/components/CnIndexPageBulkBand.spec.js`
- **acceptance_criteria**:
  - The band renders between toolbar and card only while rows are selected
  - Lead text uses the schema plural; `bulkHint` renders when set
  - The live region still announces the count
- [ ] Implement
- [ ] Test

### Task 6: The table card and the row menu
- **spec_ref**: `openspec/changes/screens-index-list-parity/specs/index-list-board-look/spec.md#requirement-the-table-is-a-white-card-with-one-row-menu`
- **files**: `src/css/table.css`, `src/css/look-board.css`, `src/components/CnDataTable/CnDataTable.vue`, `src/components/CnRowActions/CnRowActions.vue`, `e2e/screens-index-list-parity.e2e.js`
- **acceptance_criteria**:
  - Radius 12, no shadow, header and cell padding as specified
  - One 34px menu button per row named after the row; no hover icons under the look
- [ ] Implement
- [ ] Test

### Task 7: The footer inside the card
- **spec_ref**: `openspec/changes/screens-index-list-parity/specs/index-list-board-look/spec.md#requirement-the-footer-sits-inside-the-card`
- **files**: `src/components/CnPagination/CnPagination.vue`, `src/css/pagination.css`, `src/components/CnIndexPage/CnIndexPage.vue`, `tests/components/CnPaginationBoard.spec.js`
- **acceptance_criteria**:
  - `variant: "board"` renders count text, numbered 34px links, Previous and Next only where they lead somewhere
  - No First, Last or page-size select in the board variant; the default variant is unchanged
  - The footer is a child of the table card under the look
- [ ] Implement
- [ ] Test
