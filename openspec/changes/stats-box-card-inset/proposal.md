# Proposal: stats-box-card-inset

## Why

Board DcRapportages draws "Vergaderingen en efficiëntie" as a card 22px from its edge, its header 14px above four
boxed stat tiles, with no rule under the header. On a dashboard the card-fit cell padding (8px 14px) plus the stats
grid's own 24px put the tiles 38px from the card's side, under the wrapper's header divider.

## What changes

In the board look, a dashboard card holding boxed stat tiles (`tiles: "box"`) draws its header 22px in with no rule
under it, and its tiles 22px from the sides, 14px under the header and 20px above the bottom. Other stats cards keep
their inset and divider.
