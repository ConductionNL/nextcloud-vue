---
kind: code
---

# Proposal: board-setup-choice-inset

## Summary

DqInstellen measures a setup step's radio 21px inside the option's edge; live drew it 15px in (r25b). In the board look a setup step's option gets 20px side padding (19px on the chosen option, whose border is 2px).

## Scope

- `src/css/look-board.css`, `tests/css/lookBoardChoiceCards.spec.js`. No schema change.
