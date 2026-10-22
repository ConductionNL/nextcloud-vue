# Proposal: board-banner-action-buttons

## Why

The boards draw a banner's actions as the board's buttons: 40px tall, 14px text, a primary with no edge (PtDashboard
"Verzoek beoordelen"). CnBannerWidget reads Nextcloud's 34px clickable area and the 15px body text, and edges its
primary in the primary colour (COMPDIFF pq2 `h 40>34, border 0>1, fontSize 14>15`; still so on :8080 with 2.124).

## What changes

In the board look a banner action is at least the 40px control height with 14px text, and the primary action has no
border.

## Scope

Board-only, `look-board.css`. The secondary action keeps its 1px control edge.
