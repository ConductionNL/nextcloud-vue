# board-stepper-one-line Delta: wizard-dialog

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-stepper-one-line](../../)

## ADDED Requirements

### Requirement: The board stepper keeps one row

In the board look CnStepper SHALL draw every step on one row and SHALL NOT wrap. When the row is too narrow the connectors SHALL shrink first (to 8px), then the step labels SHALL truncate with an ellipsis; the full label stays readable to assistive technology.
