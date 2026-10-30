# Proposal: record-all-follows-its-card

## Why

DqDagAfsluiten puts Annuleren / Dag afsluiten at the foot of the "Klaar voor vandaag?" card
(`noteAction.recordAll.placement.widget`). The notes list looked for that card when it mounted and once more a tick
later. On :8080 (r36, 29 Oct) the card came on the page seconds after the list, and on one load the pair was in no part
of the page at all: it had been moved into a card element the grid drew again, so the day could not be closed.

## What changes

The list looks for the placed card again whenever the page changes, until it unmounts: a card that arrives later takes
the pair, and a pair whose card is no longer on the page moves to the card drawn in its place (or back under the rows).

## Scope

CnRecordNoteRows. No schema change.
