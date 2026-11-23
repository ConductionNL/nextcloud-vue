# Proposal: grouped-cards-titled-card

## Why

r25b on :8080, DqZaaktype "Fasen en taken": the grouped cards drew bare on the page, without the card, its title
"Fasen en taken" or its subtitle, so the sunken phase groups lay on the page ground and could not be told apart.
Each task card also put its "···" under the meta instead of at its end.

## What changes

- `grouped-cards` joins the content-only types: on a detail card surface the host draws its titled card with the
  manifest title and subtitle, like the other bare renderers.
- Board look: a card with actions holds them at its end, beside the title and meta.

## Reach

widgetDispatch.js and look-board-detail.css. Only dossiq declares grouped-cards today.
