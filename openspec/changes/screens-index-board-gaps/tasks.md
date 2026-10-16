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
