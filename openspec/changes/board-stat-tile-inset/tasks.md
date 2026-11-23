# Tasks: board-stat-tile-inset

### Task 1: A board stat tile in a card-fit cell sits on the board's inset
- **spec_ref**: `openspec/changes/board-stat-tile-inset/specs/board-stat-tile-inset/spec.md#requirement-a-board-stat-tile-in-a-card-fit-cell-sits-on-the-boards-inset`
- **files**: `src/css/look-board.css`, `tests/css/lookBoardDashboardHeaderRow.spec.js`
- [x] Implement: no cell padding for any card-fit board tile, `border-width: 0` on the tile
- [x] Test: `tests/css/lookBoardStatTileInset.spec.js`

### Task 2: A board stat tile's label and caption are set at the normal line height
- **spec_ref**: `openspec/changes/board-stat-tile-inset/specs/board-stat-tile-inset/spec.md#requirement-a-board-stat-tiles-label-and-caption-are-set-at-the-normal-line-height`
- **files**: `src/css/kpi-card.css`
- [x] Implement: `line-height: normal` on the board tile's title, title text and caption line
- [x] Test: `tests/css/lookBoardStatTileInset.spec.js`
