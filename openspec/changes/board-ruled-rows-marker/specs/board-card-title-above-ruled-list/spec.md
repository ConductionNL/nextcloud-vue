## ADDED Requirements

### Requirement: An app's own ruled list starts 6px under the card title

In the board look, a dashboard card whose content holds an element with the class `cn-board-ruled-rows` SHALL pad its header 6px at the bottom, as it does over a record list that rules above its first row.

#### Scenario: pipelinq My work
- **GIVEN** a bordered board dashboard card whose content is pipelinq's My work list marked `cn-board-ruled-rows`
- **THEN** the card header SHALL have a 6px bottom padding

@e2e exclude A stylesheet rule; the unit test reads it from look-board.css.
