---
kind: code
---

# Proposal: board-stepper-one-line

## Summary

Board DqInstellen draws the six setup steps on one row. The board look let the stepper wrap, so "Zaaktypen" and "Klaar" fell to a second line and every card below moved down 71px.

## Scope

- `src/components/CnStepper/CnStepper.vue` (board look styles), `tests/components/CnStepperOneLine.spec.js`.

## Out of scope

- The Nextcloud look's stacked stepper, which already keeps one row.
