# Proposal: status-explainer-board

## Why

The case Status card on the dossiq boards (DqZaak and its tabs) says where the case stands in one bold line, "Stukken
worden verzameld en beoordeeld", with "3 werkdagen in deze status" under it. The status explainer drew a grey box with
the withheld moves listed in it, the content the board does not draw (WORKLIST r23, "Content, not padding").

## What changes

- `withheld: false` leaves the withheld moves out.
- In the board look the explainer draws no box; the explanation is its bold line, the dwell muted under it.

## Scope

Additive for the content key; the board look changes the explainer's box everywhere it is used under the board look.
