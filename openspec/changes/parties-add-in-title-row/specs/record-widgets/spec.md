## ADDED Requirements

### Requirement: A parties card can put its add button in the title row

With `manage.add.placement` "title" the parties widget SHALL report its add button as a title-row action of the
card (the `header` event) and SHALL NOT draw it above the parties. The action follows the same gate as the button:
it is reported only when the reader may update the record.

#### Scenario: Rollen on a case
- **GIVEN** the case's Rollen card with `manage.add.placement` "title"
- **THEN** "Betrokkene toevoegen" stands in the card's title row
- **AND** the accepted kinds strip is the first thing under the title

#### Scenario: a reader who may not update the case
- **GIVEN** OpenRegister says the reader may not update the record
- **THEN** the title row has no add button
