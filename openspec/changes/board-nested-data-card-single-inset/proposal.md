# A bare data grid inside a card is inset once

## Why
pl9 measured the data grid in PqJourney "Journeygegevens", PqContract "Facturering" and PqMailinglijst "Lijstgegevens" 45px from the card edge and about 30px under the title, where the boards draw 23px and 14px. The grid sits bare in a section or a tab panel; its chromeless wrapper has no header, so the header-less card rule gave it a second 20px 22px inside the card.

## What changes
In the board look, a data grid placed bare in a section or a tab panel takes no padding of its own, and a sections card that opens on such a grid starts it 14px under the card title.
