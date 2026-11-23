---
kind: code
---

# Proposal: dashboard-layout-swap-keeps-order

## Summary

PqWerkplekKlant: when a call starts, the page swaps to its in-call layout (`layoutWhen`) and the row of six quick-action tiles is authored on top, 12 wide. Live (pl6, 30 Oct) draws the tiles under all three columns.

The grid adds the cards of a new layout one at a time, each in its own tick. The tiles cell is size-to-content, so GridStack grows it as soon as it is added. The next card is added at its authored row, collides with the grown tiles, and GridStack moves the card it collides with (the tiles) below the new one, since the grid is not loading. Every following card does the same, so the tiles end at the bottom. Replayed on GridStack's own engine: `cw y0 ci y0 ck y0 ... cq y13`.

CnDashboardGrid now adds the cards a layout change brings in one pass, top to bottom and then left to right, and sizes the size-to-content ones only after all of them are placed, in the same order, through the growth path that moves the cards under a growing cell down first.

## Scope

- `src/components/CnDashboardGrid/CnDashboardGrid.vue`: `syncGridItems` adds new cards in row order, `addWidgetsInOrder` defers their size-to-content measure until all are placed.
- No schema change and no manifest change.
