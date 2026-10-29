# Proposal: board-close-day-card-insets

## Why

DqDagAfsluiten's "Klaar voor vandaag?" card draws its title and sentence 24px in, then a band ruled across the card
with Annuleren and Dag afsluiten 24px from its edges, 14px under the rule and 14px above the card's foot. On r36 the
placed pair took 22px back on both sides from a content box that has no inset, so the band ran 21px past the card,
Annuleren sat 1px from the card's edge and the buttons touched its foot.

## What changes

In the board look the placed pair's band has no negative margin, 14px above and below the buttons and 23px at the
sides (24px with the pair's own 1px), and the card that holds it sets the dashboard card inset to 24px.

## Scope

look-board.css only.
