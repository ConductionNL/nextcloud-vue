# A record list's avatar can be the small circle

## Why

COMPDIFF r25e DqZaakBesluiten (25 Oct): the Adviezen rows' text stood 75px in, the board's 67: the board draws a 32px initials circle 12px from the title, the list a 36px one 16px away.

## What changes

- `avatar: { text, size: 32 }` draws the 32px circle 12px from the title; the row keeps 16px between its other parts. Without `size` the 36px circle stays.

## Impact

CnRecordListWidget only, opt-in. No schema change (widget content is open).
