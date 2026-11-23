# Proposal: board-bulk-band-leading

## Why

COMPDIFF r23 measured the bulk band ("Met de geselecteerde zaken") on DqZaken, DqZakenSorteren, DqFilterBeheren and
DqFilterInMenu with `header.lineHeight 16.8>21` and the first row 4px off. The boards set the band's text at the font's
normal line height and leave 6px after the lead before the buttons. Live inherits Nextcloud's 1.5 line height and puts
the first button 8px after the lead.

## What changes

In the board look the bulk band sets its text at `line-height: normal`, and its lead keeps 6px after it. The Nextcloud
look is unchanged.
