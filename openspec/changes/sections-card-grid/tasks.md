# Tasks: sections-card-grid

### Task 1: A sections widget can lay its cards out in columns
- **spec_ref**: `openspec/changes/sections-card-grid/specs/sections-card-grid/spec.md#requirement-a-sections-widget-can-lay-its-cards-out-in-columns`
- **files**: `src/components/CnSectionsWidget/CnSectionsWidget.vue`, `docs/components/cn-sections-widget.md`
- [x] Implement: `columns`, capped at 4, ignored with a side column
- [x] Test: `tests/components/CnSectionsWidgetCardGrid.spec.js`, `tests/components/CnDashboardPageSectionsGrid.spec.js`

### Task 2: A sections widget can close with a footnote
- **spec_ref**: `openspec/changes/sections-card-grid/specs/sections-card-grid/spec.md#requirement-a-sections-widget-can-close-with-a-footnote`
- **files**: `src/components/CnSectionsWidget/CnSectionsWidget.vue`
- [x] Implement: `footnote`, translated, under the sections
- [x] Test: `tests/components/CnSectionsWidgetCardGrid.spec.js`

### Task 3: A board card of cards draws the board's small cards
- **spec_ref**: `openspec/changes/sections-card-grid/specs/sections-card-grid/spec.md#requirement-a-board-card-of-cards-draws-the-boards-small-cards`
- **files**: `src/css/look-board.css`
- [x] Implement: the dashboard inset, the small card and its heading
- [x] Test: `tests/css/lookBoardSectionsCardGrid.spec.js`
