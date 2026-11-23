# The calendar and Deck cards as ruled rows in the board look

## Why
DqZaakTaken draws "Afspraken" and "Kaarten" as ruled rows. Each row has its title, one muted meta line and a pill at the end:
- "14 okt, 10:00 tot 10:30 · stadskantoor, balie 3 · Sanne de Vries", with Uitgenodigd;
- "Bord Woo en informatie · lijst Deze week · Lars de Koning", with Bezig.

"Deck openen" is a link under the rows. Live drew icon rows with the open link in a centred card footer, and the Deck card as a mini-kanban (r26c structure flags).

## What changes
On a detail page in the board look:
- CnCalendarCard draws ruled rows with a meta line (when, where, who) and the event status as a pill. "Open in Calendar" is a link under the rows, with no footer.
- CnDeckCard draws ruled rows with a meta line (board, list, assignees), the first label as a pill and "Open Deck" under the rows, instead of the mini-kanban.
- The status and the card parts move into shared helpers (`eventStatus.js`, `deckCardParts.js`) that the tabs use too.
- nl: "Bord {name}", "lijst {name}", "{start} tot {end}", "Voorlopig", "Bevestigd", "Geannuleerd".

The Nextcloud look is unchanged. No schema change.
