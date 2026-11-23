# Proposal: board-map-rounded

## Why

Boards DqZaak and DqZaakMeer draw the map in the "Locaties" card with rounded
corners (8px); in the board look the map drew square tiles to its edges.

## What changes

In the board look a map that is not fullscreen takes `--cn-board-control-radius`
and clips its tiles to it.
