# Proposal: board-saved-view-menu-round

## Why

The boards draw a saved view row's menu trigger ("Beheer Termijn deze week") as a round 34px button. NcActions draws it
with the 8px element radius. COMPDIFF r24: `borderRadius 17>8` on 6 items (DqFilterBeheren, DqFilterInMenu).

## What changes

In the board look the menu trigger of a CnSavedViewsPanel row is round (17px radius). Measured on :8080 with the rule
injected: 8px to 17px.

## Scope

Board-only, `look-board-index.css`. No schema change.
