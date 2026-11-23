# A card's own header items before its manifest buttons

## Why
The boards put a card's count or status before its title-row buttons ("1 locatie", "2 gepland", then "+ Toevoegen"). r30 drew DqZaakTaken "Wat hierna komt" with the button first and the note after it. CnWidgetWrapper puts the manifest's `headerActions` before the `actions` slot that carries the widget's own header items.

## What changes
In the board look, the widget's header items (`.cn-detail-widget-header-items`: note, pill, its own buttons) are ordered before the manifest buttons. No markup change, no schema change.
