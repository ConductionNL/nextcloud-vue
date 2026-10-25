---
kind: code
---

# Proposal: board-settings-switch-radio-flush

## Summary

In a board settings card a switch or radio sat 9px in from the fields around it (NcCheckboxRadioSwitch content padding); the boards draw them at the content edge with the label 12px (switch) or 10px (radio) after the control. r29 DqBeheerinstellingen AI card firstRowInsetLeft 43 vs 32.

## Scope

- `src/css/look-board.css`, a css test.
