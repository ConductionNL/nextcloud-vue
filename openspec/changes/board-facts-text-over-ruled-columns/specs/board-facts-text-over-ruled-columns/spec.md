# board-facts-text-over-ruled-columns Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-facts-text-over-ruled-columns](../../)

## ADDED Requirements

### Requirement: Running text over ruled columns is a 14px column

In the board look, a main-column facts widget that opens with running text followed by ruled three-column facts SHALL start the text 14px under the card title and the facts 14px under the text. Running text followed by anything else keeps its 12px start.

#### Scenario: DqSociaalDomein De melding

- GIVEN the case "Melding Jeugdwet gezin Oosthaven" in the board look
- THEN "De melding" is as tall as drawn, and "Andere zaken van dit huishouden" starts where the board draws it
