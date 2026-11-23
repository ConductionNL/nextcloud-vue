# The Deck card offers link and create in its title row

## Why
DqZaakTaken draws the case's "Kaarten" card with "Bestaande kaart koppelen" and "Nieuwe kaart" in its title row. The
calendar card already does this for appointments (`headerActions`). The Deck card offered neither, so r26a reported the
title-row toolbar missing on live, and a handler had to open the side tab to link or create a card.

## What changes
CnDeckCard takes `headerActions` (`link`, `create`, in the order given; none by default), with `linkLabel` and
`createLabel`. On a detail page with an object it draws them as secondary buttons. They open the Deck tab's own picker
and create dialogs, post to the same `/objects/{register}/{schema}/{id}/deck` endpoints, and reload the card. nl:
"Bestaande kaart koppelen", "Nieuwe kaart", plus the three link/create errors. No schema change.
