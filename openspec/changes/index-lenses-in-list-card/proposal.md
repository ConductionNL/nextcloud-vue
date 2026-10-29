# Proposal: index-lenses-in-list-card

## Why

pl4 on board PqWachtrij: the kind lenses (Alle 12, Verzoeken 6, Klachten 1, Contactmomenten 5) are a segmented control
at the top of the list card, with the words "Soort, dan kanaal" beside them and the channel strip under them. The index
page draws its quick filters as pills above the card (or in the toolbar), and the filter strip outside the card. In a
page with a side panel the strip even fell into the grid's last row, under the list.

## What changes

- `quickFilterPlacement` (and `quickFilterPlacementByView`) take `"card"`: the lenses are a segmented control at the
  top of the list card, with their counts. Several lenses at once (`quickFilterMultiple`) keep the chips, in the card.
- `quickFilterCaption` (manifest `config.quickFilterCaption`): a short text beside the lenses in the card.
- With `"card"` the `filterStrip` sits in the card too, under the lenses, above the rows.
- The lenses stay in the card when the active lens has no rows, so the reader can switch back.
- Other placements are unchanged.
