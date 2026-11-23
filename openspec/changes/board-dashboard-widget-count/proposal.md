# Proposal: board-dashboard-widget-count

## Why

The count chip after a dashboard card's title (record-list `headerCount`) is 17px tall on the board: 1px 8px around
a 13px figure on a 15px line (DqDagAfsluiten "Nog open van vandaag", "Vandaag vastgelegd"). Live it inherits the
page's 19.5px line and stands 21.5px. COMPDIFF r23 DqDagAfsluiten pill `h 17>21.5` on both cards.

## What changes

In the board look the chip sets its figure on a 15px line (box-sizing border-box, 1px 8px, 13px). Measured on :8080
with the rule injected: 21.5px to 17px.

## Scope

Board-only, `look-board.css`. The chip's tone is unchanged. No schema change.
