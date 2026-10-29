# Proposal: board-share-search-one-ring

## Why

DqFilterDelen r35: with "han" typed, the share field reads `innerBorder 0>1`. Inside NcSelect's open 2px main-text ring, the search input draws its own 1px primary border and 2px primary focus outline, so live shows a blue field inside a dark ring. The board draws only the dark ring.

## What changes

In the board look, the input inside the share field's toggle has no border or outline of its own. The toggle draws the 2px main-text ring whenever focus is inside it, so the field keeps one visible focus indicator (WCAG 2.4.7), open or closed.
