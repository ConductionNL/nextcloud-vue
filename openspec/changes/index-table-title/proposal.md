# Proposal: index-table-title

## Why

Board PqInloop draws the walk-in queue's table inside a titled card ("In de wachtrij"), with the head row on the card's white and a rule under it. The index page's table card had no title.

## What changes

- CnIndexPage `tableTitle` (manifest `config.tableTitle`): the table view draws the title at the top of its card, in the host's translation.
- Board look: the title at 17px/700, and a titled table's head row on white with a 1px rule under it.
- Schema 2.159.0 (renumber at merge).
