# board-choice-row-chosen-white Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-choice-row-chosen-white](../../)

## ADDED Requirements

### Requirement: A chosen board option is white

In the board look a chosen CnChoiceCards row, also under the pointer, and the frame around a chosen option's fields
SHALL keep `--color-main-background` under their primary edge. The Nextcloud look SHALL keep the primary tint.

#### Scenario: DqDocumentGenereren

- **GIVEN** the template choice with "Woo-besluit deels openbaar" chosen, in the board look
- **THEN** that row is white with the 2px primary edge
