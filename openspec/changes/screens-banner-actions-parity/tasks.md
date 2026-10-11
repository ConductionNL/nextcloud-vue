# Tasks: screens-banner-actions-parity

## Implementation Tasks

### Task 1: The board attention card shows the board's actions
- **spec_ref**: `openspec/changes/screens-banner-actions-parity/specs/banner-actions/spec.md#requirement-the-board-attention-card-shows-the-boards-actions`
- **files**: `src/components/CnBannerWidget/CnBannerWidget.vue`, `docs/components/dashboard-widget-catalog.md`
- [x] Implement: `actionCap` (maxActions prop or content, four under the board look, two without)
- [x] Test: two without the look, four in order with the primary last under the look, maxActions from prop and content, invalid values ignored (`tests/components/CnBannerWidgetBoardActions.spec.js`)

### Task 2: Manifest schema
- [ ] `content.actions` maxItems 4 and `content.maxActions` (not done: a schema change needs a version number from the coordinator)
