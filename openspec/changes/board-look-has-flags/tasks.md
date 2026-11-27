# Tasks: board-look-has-flags

### Task 1: Flags instead of non-subject :has() in the board-look rules
- **spec_ref**: `openspec/changes/board-look-has-flags/specs/library-stylesheet/spec.md#requirement-the-board-look-anchors-no-has-outside-the-subject`
- **files**: `rollup.config.js`, `src/utils/hasFlagsTransform.js`, `src/utils/hasFlags.js`, `src/utils/boardLookSheet.js`, `src/utils/boardLookStyle.js`
- [x] Implement: build-time rewrite with equal specificity, flag table in boardLookSheet.js, run-time engine started by enableBoardLookStyle()
- [x] Test: `tests/utils/hasFlagsTransform.spec.js` (every board selector: no non-subject :has() left, same specificity), `tests/utils/hasFlags.spec.js`, `tests/utils/boardLookHasFlags.spec.js`

### Task 2: Measure
- [x] Live, reference stack (MEASURED, DROPPED: deleting all non-subject board :has() rules leaves recalc unchanged after nextcloud-vue #2411-#2415; the engine adds 110-230 ms script per load; kept as a parked branch, no PR): launchpad Workspace and dossiq Dashboard / My work before/after (style recalc, usable, first content), and the board-look pixel pass (main vs branch, 0 diff px)
