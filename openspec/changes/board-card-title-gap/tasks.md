# Tasks: board-card-title-gap

### Task 1: A board card's body starts the board's gap below its title
- **spec_ref**: `openspec/changes/board-card-title-gap/specs/board-card-title-gap/spec.md#requirement-a-board-cards-body-starts-the-boards-gap-below-its-title`
- **files**: `src/css/look-board-detail.css`, `src/css/look-board.css`
- [x] Implement: title line height `normal`, gap minus `--cn-board-first-line-leading`
- [x] Test: `tests/css/lookBoardCardTitleGap.spec.js`

### Task 2: The data card's grid keeps the board's gap and cell padding
- **spec_ref**: `openspec/changes/board-card-title-gap/specs/board-card-title-gap/spec.md#requirement-the-data-cards-grid-keeps-the-boards-gap-and-cell-padding`
- **files**: `src/css/look-board-detail.css`
- [x] Implement: grid and cell selectors one class above the component's scoped rules
- [x] Test: `tests/css/lookBoardCardTitleGap.spec.js`
