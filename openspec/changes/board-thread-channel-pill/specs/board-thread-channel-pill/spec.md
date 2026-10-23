## ADDED Requirements

### Requirement: a message's channel pill is 20px in the soft ink in the board look

In the board look a CnConversationThread message's channel pill MUST draw in `--cn-board-text-soft` at a 16px line height (20px tall with its 1px padding and border), and its rule MUST outrank the component's scoped rule.

#### Scenario: DqZaakContact
- GIVEN a message on the case's Contact tab in the board look
- THEN its channel pill "Telefoon" is 20px tall in the soft ink
