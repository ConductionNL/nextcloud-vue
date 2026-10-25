## ADDED Requirements

### Requirement: The Deck card can link and create in its title row

CnDeckCard SHALL draw `headerActions` (`link`, `create`) as title-row buttons on a detail page with an object, open the
Deck picker or create dialog, post to the object's Deck endpoint, and reload its list after a success.

#### Scenario: link an existing card on a case
- **GIVEN** the case's Kaarten card with `headerActions: ["link", "create"]`
- **WHEN** the handler picks a card in "Bestaande kaart koppelen"
- **THEN** the card is linked to the case and listed
