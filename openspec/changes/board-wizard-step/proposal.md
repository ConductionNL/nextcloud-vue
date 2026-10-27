---
kind: code
---

# Proposal: board-wizard-step

## Summary

r31 strict items on DqInstellen (setup wizard, step 4): the done steps' check drew in the theme's dark success text on the green circle (board: white), their labels in a soft grey (board: main text), the upcoming number 600 (board 700), and the step's intro, choice cards and note sat 11 and 26px apart (board 16). Fixed in the board look; spacing checked on :8080 with the CSS injected (intro to cards 15, cards to note 16).

## Scope

- `CnStepper.vue` board styles, `src/css/dialog.css`, a css test.
