# Tasks: board-look-sheet-in-app-bundles

### Task 1: The app sheet without the board-look block, the block on demand
- **spec_ref**: `openspec/changes/board-look-sheet-in-app-bundles/specs/library-stylesheet/spec.md#requirement-an-app-bundle-carries-the-board-look-rules-switched-off`
- **files**: `css/index.css`, `rollup.config.js`, `src/utils/boardLookSheet.js`, `src/utils/boardLookStyle.js`, `src/utils/libraryStyle.js`, `scripts/check-library-style.mjs`
- [x] Implement: `dist/nextcloud-vue.base.css`, `boardLookSheet.js` filled at build time, `addBoardSheet`
- [x] Test: `tests/utils/boardLookSheetInApps.spec.js`, `tests/utils/boardLookStyle.spec.js`; `scripts/check-library-style.mjs` after the build

### Task 2: Measure
- [x] Live, reference stack: opencatalogi pages before/after (PR body)
- [ ] A board-look app (dossiq, Zuiddrecht set): no unstyled frame, pixel pass of its main pages
