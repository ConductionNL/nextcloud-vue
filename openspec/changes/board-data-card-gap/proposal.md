# Proposal: board-data-card-gap

## Why

COMPDIFF r20 measured the first label of a data card 11.7px below the card's title where the boards draw 14px, on
six cards across four boards: DqZaak and DqZaakMeer "Zaakgegevens" and "Termijn en betaling", DqContact "Contact",
DqOrganisatie "Organisatie". The boards give a data card (labels over values, a hairline under each) 14px between
title and body, against 12px on a body card with running text. The board look gave every body card 12px.

## What changes

In the board look a detail page's body card that holds the data grid (`CnObjectDataWidget`) starts its body 14px below
its title, minus `--cn-board-first-line-leading`. Other body cards keep 12px, side cards keep 10px, and the Nextcloud
look is unchanged.
