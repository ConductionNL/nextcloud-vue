# The record-every pair in its own card

## Why
DqDagAfsluiten draws "Klaar voor vandaag?" as a card of its own after "Vandaag vastgelegd": its title and sentence, then a rule across the card and the Annuleren / Dag afsluiten pair. The notes list drew that block under its rows, inside "Nog open van vandaag", so the card under it sat 160px low (r34).

## What changes
- `noteAction.recordAll.placement: { widget }` names a dashboard card; the list puts its button pair at that card's foot (Vue Teleport) and leaves the title and sentence to the card. Without that card on the page the block stays under the rows.
- Every dashboard grid item carries `data-cn-widget-id`.
- Board look: a placed pair sits 24px under the card's text under a rule across the card.
