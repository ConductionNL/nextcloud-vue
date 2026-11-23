# Proposal: widget-side-title-tone

## Why

The boards title the cards in a page's right column as side cards: 15px, weight 600, muted. COMPDIFF r20 flagged three
cards titled 17px bold on live: DqDagAfsluiten "Uw dag" and "Hoe dit werkt" (a dashboard) and DqZaaktypeOverzicht
"Gegevens" (a detail page). On a detail page only the side column takes that heading, and a dashboard has no side
column at all, so a page could not title a right-hand card the way the board does.

## What changes

A widget definition takes `titleTone: "side"`. CnDashboardPage and CnDetailWidgetHost pass it to CnWidgetWrapper,
which marks the card, and the board look sets its title as a side heading. The Nextcloud look is unchanged.
