# Proposal: board-share-field-focus-edge

## Why

One rule for a focused field everywhere (coordinator call, 30 Oct, as design-system #801): a 1px primary edge plus the accessibility rings. board-share-search-one-ring (24t2t) gave the DqFilterDelen share field a 2px main-text ring around the toggle and took the input's own edge and rings away, as the board then drew it. design-system #807 redraws DqFilterDelen with the 1px primary edge at 40 high, which is what the input draws without those rules.

## What changes

`src/css/look-board.css`: the two share-field focus rules from board-share-search-one-ring are removed, so the search input keeps its 1px primary edge and the theme's focus rings, and the toggle draws no ring. This supersedes board-share-search-one-ring. No schema change.
