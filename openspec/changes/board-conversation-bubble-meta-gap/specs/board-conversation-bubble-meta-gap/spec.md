## ADDED Requirements

### Requirement: a board message sets its meta line at 13px, 6px above the text

In the board look a conversation message's meta line MUST be 13px, in a rule that outranks the component's scoped 0.9em, and the bubble MUST keep 6px between the meta line and the text.

#### Scenario: DqZaakContact
- GIVEN a message from Sanne de Vries by phone
- THEN "Sanne de Vries · Telefoon · Inkomend · 3 okt, 14:10" is 13px and the text starts 6px under it
