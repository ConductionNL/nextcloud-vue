# Tasks: board-move-block-reasons

### Task 1: Blocked targets with a reason
- **spec_ref**: `openspec/changes/board-move-block-reasons/specs/board-view/spec.md#requirement-a-move-target-can-be-blocked-with-a-reason`
- **files**: `src/utils/boardColumns.js`, `src/components/CnBoardView/CnBoardView.vue`, `src/components/CnIndexPage/CnIndexPage.vue`, `src/css/board.css`, `docs/components/cn-index-page.md`
- [x] Implement: `normalizeAllowed`, entry mapping in `boardAllowedMoves`, menu reason, column reason during a drag, refusal with the reason
- [x] Test: `tests/components/CnBoardMoveBlockReasons.spec.js`; e2e `e2e/l17-board-move-block-reasons.e2e.js` (`?l8=board-block-reasons`)
