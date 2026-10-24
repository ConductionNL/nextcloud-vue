---
kind: code
---

# Proposal: board-ordered-list-field

## Summary

DqPersoonlijkeInstellingen "Weergaven in mijn menu" draws a row's "Uit menu halen" as an outlined secondary button and the "Weergave toevoegen" select across the field's width. Live (r25b probe) drew a bare text button and a 260px select. In the board look CnOrderedListField's labelled remove button gets the board's secondary outline at 34px and its add select runs 100% wide.

## Scope

- `src/css/look-board.css`, `tests/css/lookBoardOrderedListField.spec.js`. No schema change.
