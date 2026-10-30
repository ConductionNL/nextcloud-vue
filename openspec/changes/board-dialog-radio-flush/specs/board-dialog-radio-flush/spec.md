# board-dialog-radio-flush Delta

**Status**: proposed
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: A radio in a board dialog sits as a checkbox does

In a board dialog a radio that is not the button variant SHALL sit flush with the fields, its label 10px after the
radio, on a 24px row, as a checkbox in a board dialog does.

#### Scenario: pipelinq's link-to-a-client dialog

- **GIVEN** the "Aan een klant koppelen" dialog in the board look
- **THEN** the radios under "Klant" and "Contactpersoon" start at the card's inner edge, as the "Lead" checkbox does
