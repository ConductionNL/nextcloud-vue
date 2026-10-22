# Proposal: board-grouped-cards-count-chip

## Why

DqZaaktype draws the count beside a phase ("2 taken") as the grey chip: 3px 10px, 13px/600, the chip ground and the
soft text, 21px tall. CnGroupedCardsWidget draws a white 12px chip in the muted text. COMPDIFF r24 DqZaaktype
"2 taken": background, colour, fontSize.

## What changes

In the board look `.cn-grouped-cards__count` takes the chip ground, the soft text, 13px on a 15px line and 3px 10px.
Measured on :8080 with the rule injected: 21px tall on the background-dark ground.

## Scope

Board-only, `look-board.css`. No schema change.
