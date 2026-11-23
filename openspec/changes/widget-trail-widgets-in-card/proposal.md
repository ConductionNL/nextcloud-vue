# A card can end with other widgets

## Why
DqZaak draws the case's goals as the last row of the Zaakplan card, under the plan. `content.leadWidgetIds` puts other
widgets inside a card before its content; nothing put one after it.

## What changes
`content.trailWidgetIds` draws the named widgets inside the card after its own content, bare, each only while its
`visibleWhen` holds, as `leadWidgetIds` does before it. The lead and trail lists share one lookup. No schema change.
