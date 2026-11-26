# Tasks: board-look-sheet-on-demand

### Task 1: Board-look rules in their own sheet, off until used
- **spec_ref**: `openspec/changes/board-look-sheet-on-demand/specs/library-stylesheet/spec.md#requirement-the-board-look-rules-are-active-only-where-the-board-look-is-used`
- **files**: `src/css/index.css`, `src/css/look-board-sheet-start.css`, `src/css/look-board-sheet-end.css`, `src/utils/libraryStyle.js`, `src/utils/boardLookStyle.js`, `rollup.config.js`, `src/composables/useLook.js`, `src/components/CnAppRoot/CnAppRoot.vue`, `src/components/CnPageRenderer/CnPageRenderer.vue`, `src/components/CnDetailPage/CnDetailPage.vue`
- [x] Implement: markers in `css/index.css`, `splitBoardLook`, the board sheet in `installLibraryStyle`, `enableBoardLookStyle` and its callers
- [x] Test: `tests/utils/boardLookStyle.spec.js`; `scripts/check-library-style.mjs` after the build

### Task 2: Measure
- [ ] Live, reference stack: opencatalogi Dashboard (default look) before/after, and a board-look app (dossiq, Zuiddrecht set) to confirm no unstyled frame and no cascade change (pixel pass of its main pages)
