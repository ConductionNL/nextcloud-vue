# The board conflict card's choices are outline buttons

## Why

Board DqInspectie (the "Synchroniseren" phone) draws the conflict card's two
choices, "Deze houden" and "Die van kantoor", as 34px outline buttons: no fill,
a 1px control border, 14px in, the main ink at 14px/600. CnConflictResolveCard
renders them as NcButton secondary, which Nextcloud fills with the light
primary tint.

## What changes

- Under the board look, a secondary button in `cn-conflict-resolve__actions`
  is 34px tall, 14px in, transparent with the board control border, main ink
  at 14px/600, and takes the hover ground on hover.
- Without the board look the card keeps NcButton secondary.
- CSS only: no props, no strings, no schema change.
