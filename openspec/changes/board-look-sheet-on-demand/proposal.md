---
kind: code
---

# Proposal: board-look-sheet-on-demand

## Summary

The board look's global stylesheets (`css/look-board.css`, `look-board-index.css`, `look-board-detail.css`,
`look-board-reports.css`) hold about 260 rules with `:has()`. A browser builds `:has()` invalidation for every such
rule in an active stylesheet, whatever ancestor class scopes it, and a dashboard's DOM churn pays for it on every
load. Measured on the reference stack (opencatalogi Dashboard, default look, interleaved medians of 7): the library
sheet as shipped 1094-1255 ms usable; the same sheet minus the board `:has()` rules 921-956 ms. Catalogs and
Directory do not move.

## Scope

1. `css/index.css` imports the four board files last, between two marker comments. Every rule in them is scoped to
   `.cn-look-board`, and no selector in a file that used to follow them repeats one of theirs with the same property,
   so the move changes no cascade outcome.
2. The published ESM build cuts the marked block out of the installed library sheet and installs it as its own
   `<style data-cn-library-board media="not all">` right after `<style data-cn-library>`, by the same
   newest-build-wins rule. A sheet whose media never matches takes no part in matching or invalidation.
3. `enableBoardLookStyle()` removes that `media` and sets `data-cn-board-look` on `<html>` (so a newer build that
   installs later comes in switched on). `useLook()`, CnAppRoot, CnPageRenderer and CnDetailPage call it from an
   immediate watcher when they resolve the board look, i.e. before their first render: no unstyled frame. It is
   exported for apps that put `cn-look-board` on their own markup.
4. `dist/nextcloud-vue.css`, `dist/esm/nextcloud-vue.css` and `css/index.css` stay complete, so apps that import the
   file, or bundle the library source, see no change.

No change is required in the apps.
