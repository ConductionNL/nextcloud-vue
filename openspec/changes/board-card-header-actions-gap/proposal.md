# A card's title-row buttons stand 8px apart

## Why

The boards draw two buttons in a card's title row 8px apart (DqZaakContact
"Groot incident melden" / "Gesprek starten", DqZaakEmail "Mail koppelen" /
"Mail opstellen"). CnWidgetWrapper keeps them 4px apart (r25b: gap 4 vs 8).

## What changes

In the board look a card's header actions are 8px apart. The Nextcloud look
keeps 4px.
