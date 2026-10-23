## ADDED Requirements

### Requirement: The board look draws a card's Add as a title-row button

In the board look a catalog list card (object-list or table, off a tab panel) SHALL draw its Add as a 40px secondary button, right-aligned in the card's title row, and SHALL NOT draw the list's footer Add bar or an Add item in the Actions menu. In the Nextcloud look the card SHALL keep ADR-062's footer bar and the Actions menu item.

#### Scenario: DqZaakGerelateerd in the board look

- **GIVEN** the case's Deelzaken card in the board look
- **THEN** "Deelzaak aanmaken" is a 40px secondary button in the title row
- **AND** the card shows no footer Add bar

#### Scenario: the Nextcloud look

- **GIVEN** the same card in the Nextcloud look
- **THEN** the Add is the footer bar and an Actions menu item, as before
