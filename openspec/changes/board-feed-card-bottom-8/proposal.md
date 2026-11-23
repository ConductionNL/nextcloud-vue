# Proposal: board-feed-card-bottom-8

## Why

The contact boards disagreed on the bottom of the "Laatste contactmomenten" card. DqContact, PqKlant and
PqOrganisatie drew 8px under the last row, DqOrganisatie drew 20. The board call (design-system #1037) redraws
DqOrganisatie to 8, so all four contact boards now agree. Live kept the 20px of every other page card, so the feed
card stood 12px taller than drawn (r45: DqContact 254 against 263.8).

## What changes

- A ruled feed in a page card (`presentation: feed`, `ruleAbove`) ends 8px under its last row.

Board look only; Nextcloud's own look is unchanged. Ruled lists and every other page card keep their 20px bottom.
