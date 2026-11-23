# Tasks: board-widget-header-action-neutral

### Task 1: The header action is styled where it is rendered
- **spec_ref**: `openspec/changes/board-widget-header-action-neutral/specs/board-widget-header-action-neutral/spec.md#requirement-a-widget-header-action-is-styled-where-it-is-rendered`
- **files**: `src/components/CnDetailWidgetHost/CnDetailWidgetHeaderItems.vue`, `src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue`
- [x] Implement: move the `.cn-detail-page__catalog-action` rule into CnDetailWidgetHeaderItems
- [x] Test: `tests/components/CnDetailWidgetHeaderActionLook.spec.js`

### Task 2: A board header action in the main column is a neutral 40px control
- **spec_ref**: `openspec/changes/board-widget-header-action-neutral/specs/board-widget-header-action-neutral/spec.md#requirement-a-board-widget-header-action-in-the-main-column-is-a-neutral-40px-control`
- **files**: `src/css/look-board-detail.css`
- [x] Implement: the board rule outside the side column
- [x] Test: `tests/components/CnDetailWidgetHeaderActionLook.spec.js`
