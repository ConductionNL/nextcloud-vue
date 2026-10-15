---
kind: code
---

# Proposal: dashboard-growth-keeps-order

## Summary

pipelinq's simple dashboard at 1100 wide: the size-to-content banner over the stat tiles grows from two rows to three when its text wraps. GridStack resolves the collision itself and puts the full-width "client in focus" card below the lists instead of moving everything under the banner down a row. The card's place is left as a gap. `gridFloat: false` does not change this, and neither does the row split of #1612. Measured in the harness: the card lands at 1440px (float true) or 1350px (float false), under lists that start at 720px or 630px.

Two causes, two fixes:

- **On load.** GridStack sizes a size-to-content cell while it adds the items one at a time, and an item added onto a cell that has already grown moves itself below whatever it collides with. The items were added in the layout's own order, and pipelinq declares the full-width card after the lists. So it was added last, collided with the grown stat tiles, and skipped past the lists to the bottom. CnDashboardGrid now renders, and so adds, its items top to bottom and then left to right (`itemsInRowOrder`). That is also the order a screen reader and the Tab key follow.
- **Later.** When content arrives after the grid is built and a size-to-content cell grows, CnDashboardGrid now first moves the cards the growth reaches down by the growth, along with every card those moves reach in turn. It moves the bottom-most first, and only then grows the cell, so GridStack has no collision left to resolve. Cards beside the cell stay where they are. A cell that shrinks is still left to GridStack.

## Scope

- `src/utils/gridStack.js`: `planGrowth(nodes, node, h)`, the moves, bottom-most first.
- `src/components/CnDashboardGrid/CnDashboardGrid.vue`: `itemsInRowOrder`, and `keepOrderOnGrowth` wraps the grid's `resizeToContent`, which is the path GridStack's own load and resize checks use and the path the content observer uses. `contentRows` measures the way GridStack does.
- No schema change and no manifest change.
