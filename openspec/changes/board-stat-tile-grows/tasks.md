# Tasks: board-stat-tile-grows

### Task 1: The tile grows instead of clipping
- **spec_ref**: `openspec/changes/board-stat-tile-grows/specs/stat-tile-board-look/spec.md#requirement-a-board-stat-tile-shows-all-its-lines`
- **files**: `src/css/kpi-card.css`
- [x] Implement: `height: auto; min-height: 100%; flex: 0 0 auto` on the stacked board tile
- [x] Test: e2e `e2e/l11-stat-tile-fit.e2e.js` (rendered text heights; jsdom lays nothing out)
