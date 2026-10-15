# Tasks: board-settings-card-spacing

### Task 1: The card's title group and note card spacing
- **spec_ref**: `openspec/changes/board-settings-card-spacing/specs/settings-board-look/spec.md#requirement-a-board-admin-settings-card-spaces-its-title-and-description-as-the-board-does`
- **files**: `src/css/look-board.css`
- [x] Implement: 20px 22px padding, 17px title, description 4px under the title, note card margin 0, under `.cn-look-board` on the shell's cards
- [x] Test: e2e `e2e/l12-board-settings-card.e2e.js` (rendered spacing; jsdom lays nothing out), `tests/css/lookBoardAdminSettings.spec.js` (the rules)
