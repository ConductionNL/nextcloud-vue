---
kind: code
---

# Proposal: board-page-flag

## Summary

Surfaces that Nextcloud teleports to `<body>` (action menus, select dropdowns, modal masks) sit outside every
`.cn-look-board` root, so their board-look rules were anchored at `body:has(.cn-look-board):not(:has(.cn-look-nextcloud))`
(31 rules in `css/look-board.css`, 1 in `css/dialog.css`). A `:has()` anchored at `<body>` makes the browser restyle
the whole page after most DOM insertions. Measured on the sandbox reference stack (launchpad Workspace, board look,
CSSOM rewrite before the rules apply, 2 rounds x 7 warm): style recalc 331/326 -> 232/267 ms per load with the anchor
replaced by an attribute; the core Dashboard spends 23 ms.

## Scope

1. `enableBoardLookStyle()` starts `trackBoardPage()`: one mutation observer per document keeps
   `data-cn-board-page` on `<html>` while the page shows a `.cn-look-board` element and no `.cn-look-nextcloud`
   element (live collections, checked after each batch of inserted, removed or re-classed elements, which runs before
   the next style pass).
2. The 32 rules key on `:root[data-cn-board-page] body` instead: the same specificity (0,2,1), so no cascade outcome
   changes.
3. No change is required in the apps: every component that resolves the board look already calls
   `enableBoardLookStyle()`.
