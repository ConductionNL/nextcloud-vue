# Proposal: board-card-rhythm-r34

## Why

r34 (DQ-L7 boards) measured cards whose own spacing moved every card under them:

- DqSociaalDomein "De melding" stood 30px short: the board rules each of its three-column facts (a soft hairline 10px under the value, the value at 500), while the board look made all column facts plain (that rule was written for the two-column DqContact "Contact").
- DqOrganisatie "Lopende zaken" and "Open tickets" each stood 6px short: a stacked side row drew its meta 2px and its pill 6px under the line above, the board 4px and 10px.
- DqOrganisatie "Hoofdcontact" stood 8px tall: the e-mail and the "Alle 2 contactpersonen" link took Nextcloud's 1.5 leading, and the e-mail read as an underlined link where the board writes it in the ink.
- DqTaak "Afspraken": the appointment row was 64.5 against 60 (the 13px meta at 1.5 leading) and the first row 44.8 under the title against 41 (12px content padding where the board leaves 8).
- DqTaak "Zaak" stood 23.8 tall: the case title and its two lines stood 10px apart, the board draws them as one block, 2px apart.

## What changes

Board-look CSS only, in `src/css/look-board-detail.css`. No schema change.
