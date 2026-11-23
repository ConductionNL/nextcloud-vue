## ADDED Requirements

### Requirement: An appointment without a status shows where its invitees stand

An event without its own status SHALL show a pill from its invitees' answers: Afgewezen when one declined, else Uitgenodigd while one has to answer, else Voorlopig for a tentative answer, else Geaccepteerd when all accepted. An event without answers SHALL show no pill.

#### Scenario: an explanation at the desk
- **GIVEN** Sanne de Vries is invited and has not answered
- **THEN** the appointment shows "Uitgenodigd"
