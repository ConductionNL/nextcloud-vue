# Proposal: board-dashboard-table-in-card

## Why

COMPDIFF r32, DqDoorlooptijd: the tables on the "Zaken met risico" and "Prestaties per zaaktype" cards drew the index
page's table card (1px border, radius 12) inside the dashboard card, which compdiff read as two extra cards, and the
pager sat 16px in from the card's inset. The boards draw the table straight on the card and the pager on its inset.

## What changes

In the board look only, a `CnDataTable` inside a dashboard widget card draws no border or radius, and its board pager
pads 12px at the top only. The index page's table card is unchanged.
