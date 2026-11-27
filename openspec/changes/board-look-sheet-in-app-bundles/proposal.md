# Proposal: board-look-sheet-in-app-bundles

## Why

`board-look-sheet-on-demand` (#2390) moved the board-look rules (~350 `:has()` rules) into their own sheet that stays
off until a component uses the board look. That sheet is installed by `dist/esm/library-style.js`, which the ESM entry
pulls in with a bare `import './library-style.js'`. `library-style.js` is not in `package.json#sideEffects`, so webpack
drops that import in every app: an app's library rules come only from its own `css/index.css` import, and that file
still carried the whole sheet, board-look block included. So the switch never reached an app page.

Measured on the reference stack (opencatalogi, default look): cutting the block out of the app's sheet takes the
Dashboard's style recalculation from ~240 to ~90 ms and its usable time down by ~150 ms.

## What

- `css/index.css` imports `dist/nextcloud-vue.base.css`: the sheet without the board-look block, with a
  `/*! cn-board-look-slot */` comment where the block was. `dist/nextcloud-vue.css` stays complete.
- The build fills `src/utils/boardLookSheet.js` (empty in the source) with the block.
- `enableBoardLookStyle()`, when no board sheet is on the page, adds `<style data-cn-library-board>` with those rules
  right after the library sheet (the `<style>` holding the slot comment, or `data-cn-library`).

Not done: adding `library-style.js` to `sideEffects`. Apps import `css/index.css` as the docs tell them, so the
installer would put a second copy of the base sheet on every page.
