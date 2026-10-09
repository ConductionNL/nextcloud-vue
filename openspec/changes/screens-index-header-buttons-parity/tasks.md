# Tasks: screens-index-header-buttons-parity

## Implementation Tasks

### Task 1: The add header button carries a plus
- **spec_ref**: `openspec/changes/screens-index-header-buttons-parity/specs/index-list-board-look/spec.md#requirement-the-add-header-button-carries-a-plus`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue`
- [x] Implement: `Plus` default icon on `add` under the board look
- [x] Test: board default, named icon wins, other buttons and the Nextcloud look untouched (`tests/components/CnIndexPageBoardAddIcon.spec.js`)

### Task 2: The header buttons keep the board button under any theme
- **spec_ref**: `openspec/changes/screens-index-header-buttons-parity/specs/index-list-board-look/spec.md#requirement-the-header-buttons-keep-the-board-button-under-any-theme`
- **files**: `src/css/look-board-index.css`
- [x] Implement: `!important` board values on the index header's direct buttons
- [x] Test: CSS values and scope (`tests/css/lookBoardIndexHeaderButtons.spec.js`)
- [ ] Browser check under the nldesign theme — not run: the app lanes own the browsers and :8080

### Task 3: Documentation
- **files**: `docs/components/cn-index-page.md`
- [x] The plus and the theme note in the board look section
