# Proposal: facts-tiles-columns

## Why

Board PqJourney (pipelinq) draws a journey's steps as tiles: Trigger, Wachten and Voorwaarde side by side, and Actie on its own row across the card. `layout: "tiles"` wraps the tiles freely, so all four sat in one row and the measure found no full-width Actie tile.

## What changes

- With `layout: "tiles"`, `columns` (2 or more) sets the tiles in that many equal columns. Under 640px they stack.
- A field with `wide: true` spans the whole row in that grid.
- `columns` no longer adds the label-above-value column classes to tiles (they had no effect under the tiles' flex layout).
- Without `columns` the tiles wrap as before.
