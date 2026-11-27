# Proposal: board-look-has-flags

## Why

The board look's stylesheets hold ~160 selectors with a `:has()` OUTSIDE the selector's subject
(`.a:has(.b) .c`, `body:has(.cn-look-board):not(:has(.cn-look-nextcloud)) .x`). Blink re-styles the whole subtree of
such an anchor whenever a node is inserted below it, and Vue and GridStack insert nodes all through a page load.
Measured on dossiq's Dashboard (look: board): ~175 full-subtree style passes per warm load, invalidation reason
"Affected by :has()" on the whole ancestor chain. Deleting the 137 non-subject rules cut style recalculation from
2.5 s to 0.9 s per load; deleting any half, quarter or the "worst" groups changed nothing, so the fix has to cover
every one of them.

## What

- The build (rollup, `library-style-module`) rewrites every non-subject compound that holds a `:has()` in the
  board-look block into a flag class with the same specificity: `:where(.cn-h-<hash>):not(<pad>)`. The pad is a
  `:not()` of a selector that matches nothing and carries exactly the specificity of the removed compound, so no
  cascade outcome changes. Compounds that read a state a MutationObserver cannot see (`:hover`, `:focus`...) stay.
- The build carries the table `[flag, compound, key]` in `utils/boardLookSheet.js` (`BOARD_LOOK_HAS`).
- `enableBoardLookStyle()` starts `installHasFlags()`: one MutationObserver per document puts each flag on exactly
  the elements that match its compound, and re-checks after DOM changes as a microtask, before the browser renders or
  a script reads layout. A compound whose top-level class or type is not on the page costs a live collection's length.
- Several builds on one page share one engine; flag names hash the compound, so they agree across builds.

Not changed: subject-position `:has()` (no subtree restyles), the base sheet, and `dist/nextcloud-vue.css` (the
complete sheet keeps its `:has()` rules for consumers that do not run the library's JavaScript).
