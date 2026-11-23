## ADDED Requirements

### Requirement: The contacts tab in a board card lines up with the card

In the board look, the contacts tab drawn inside a detail card SHALL take no padding of its own, and its button row SHALL
start at the card's text edge.

#### Scenario: Partijen card
- **GIVEN** the case's Partijen card in the board look
- **WHEN** it renders
- **THEN** "Contact koppelen" SHALL start at the same x as the card's subtitle

### Requirement: The contacts tab's empty state is translated

The empty state's lines SHALL have Dutch translations.

#### Scenario: Dutch reader, no contacts
- **WHEN** a Dutch reader opens a card with no linked contacts
- **THEN** it reads "Geen contacten gekoppeld" and "Koppel een contact uit je adresboek."
