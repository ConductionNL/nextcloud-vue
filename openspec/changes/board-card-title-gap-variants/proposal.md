# Proposal: board-card-title-gap-variants

## Why

COMPDIFF r22 measured the first line of three kinds of detail card closer to the card's title than the boards draw it:

- a side card that opens on a lead (initials or icon tile beside a name): 9.8px against 15.5px, on 14 cards (DqZaak and
  every case tab "Aanvrager", DqOrganisatie "KvK en adres");
- a body card whose facts open on the column grid: 11.8px against 14px (DqContact "Contact", DqOrganisatie
  "Organisatie");
- a body card that opens on running text: 11.8px against 15px (DqZaak and DqZaakMeer "Het verzoek"; DqSociaalDomein
  "De melding" moves from 11.8px to 15px against the board's 17px).

The boards draw a lead row 12px below the title with its two lines at their normal height, centred on the 40px tile;
the column grid as a data card (14px); and running text 12px below the title's box at line-height 1.6. The board look
gave every side card 10px and every body card 12px measured glyph to glyph, and set the lead and the text at 1.5.

## What changes

In the board look only:

- a side card whose facts open on a lead pads its body 12px and sets the lead's lines at `line-height: normal`;
- a body card whose facts open on the column grid pads its body `calc(14px - leading)`, as the data grid does;
- a body card whose facts open on running text pads its body 12px, and facts text in a body card is set at 1.6.

The Nextcloud look is unchanged.
