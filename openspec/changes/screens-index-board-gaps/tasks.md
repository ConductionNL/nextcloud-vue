# Tasks: screens-index-board-gaps

> The list boards' header button, view switch and rows under the board look (ADR-032 `kind: code`).

## Implementation tasks

### Task 1: The Download icon
- **spec_ref**: `openspec/changes/screens-index-board-gaps/specs/index-list-board-look/spec.md#requirement-the-download-button-carries-its-icon`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue`, `tests/components/CnIndexPageBoardListGaps.spec.js`
- **acceptance_criteria**:
  - A labelled export button carries the Download icon under the board look
- [x] Implement
- [x] Test

### Task 2: Four view segments by default
- **spec_ref**: `openspec/changes/screens-index-board-gaps/specs/index-list-board-look/spec.md#requirement-the-view-switch-draws-four-segments-by-default`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue`, `tests/components/CnIndexPageBoardListGaps.spec.js`
- **acceptance_criteria**:
  - No `viewSwitch` draws table, cards, board, map; a declared one wins
- [x] Implement
- [x] Test

### Task 3: Unread rows only on request
- **spec_ref**: `openspec/changes/screens-index-board-gaps/specs/index-list-board-look/spec.md#requirement-unread-rows-are-marked-only-where-the-reader-asked-for-them`
- **files**: `src/components/CnDataTable/CnDataTable.vue`, `src/components/CnIndexPage/CnIndexPage.vue`, `tests/components/CnIndexPageBoardListGaps.spec.js`
- **acceptance_criteria**:
  - `showUnread: false` draws unread rows plainly; board look passes it only with the Unread lens
- [x] Implement
- [x] Test

### Task 4: The single-page pager
- **spec_ref**: `openspec/changes/screens-index-board-gaps/specs/index-list-board-look/spec.md#requirement-a-single-page-still-draws-its-pager`
- **files**: `src/components/CnPagination/CnPagination.vue`, `src/css/look-board-index.css`, `tests/components/CnPaginationBoard.spec.js`
- **acceptance_criteria**:
  - One page draws "1" and an inert Next
- [x] Implement
- [x] Test

### Task 5: No sidebar toggle on the primary button
- **spec_ref**: `openspec/changes/screens-index-board-gaps/specs/index-list-board-look/spec.md#requirement-no-sidebar-toggle-on-the-primary-button`
- **files**: `src/css/look-board-index.css`, `tests/css/lookBoardSidebarToggle.spec.js`
- **acceptance_criteria**:
  - `.app-sidebar__toggle` hidden on a board page holding an index page
- [x] Implement
- [x] Test

### Task 6: The header funnel
- **spec_ref**: `openspec/changes/screens-index-board-gaps/specs/index-list-board-look/spec.md#requirement-the-header-funnel-has-the-boards-size`
- **files**: `src/css/look-board-index.css`, `tests/components/CnIndexPageBoardListGaps.spec.js`
- **acceptance_criteria**:
  - 22px funnel, 4px after the chevron
- [x] Implement
- [x] Test

### Task 7: `?_view=` for a mode that arrives later
- **spec_ref**: `openspec/changes/screens-index-board-gaps/specs/index-list-board-look/spec.md#requirement-the-address-opens-a-view-mode-that-arrives-later`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue`, `tests/components/CnIndexPageDossiqListGaps.spec.js`
- **acceptance_criteria**:
  - `_view=map` opens the map when it appears; a reader's own pick wins
- [x] Implement
- [x] Test

### Task 8: A link column
- **spec_ref**: `openspec/changes/screens-index-board-gaps/specs/index-list-board-look/spec.md#requirement-a-column-can-carry-the-row-link`
- **files**: `src/components/CnDataTable/CnDataTable.vue`, `tests/components/CnIndexPageDossiqListGaps.spec.js`
- **acceptance_criteria**:
  - `link: true` moves the row link, title look and marks to that column
- [x] Implement
- [x] Test

### Task 9: Named-source quick-filter counts
- **spec_ref**: `openspec/changes/screens-index-board-gaps/specs/index-list-board-look/spec.md#requirement-a-named-source-counts-its-quick-filters`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue`, `src/composables/indexSources.js`, `tests/components/CnIndexPageDossiqListGaps.spec.js`
- **acceptance_criteria**:
  - Tabs with `showCount` on the tasks source show the inbox totals
- [x] Implement
- [x] Test

### Task 10: The near-white header row
- **spec_ref**: `openspec/changes/screens-index-board-gaps/specs/index-list-board-look/spec.md#requirement-the-table-header-row-is-near-white`
- **files**: `src/css/look-board-index.css`, `tests/components/CnIndexPageBoardListGaps.spec.js`
- **acceptance_criteria**:
  - The header row uses `--cn-board-table-head-bg` over a light mix
- [x] Implement
- [x] Test
