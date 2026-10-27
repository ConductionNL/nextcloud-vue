# parties Delta

## ADDED Requirements

### Requirement: The main contact card's lines under the name are 14px in the board look

In the board look, the main contact card SHALL set its e-mail and its link to all contact persons at 14px.

#### Scenario: DqOrganisatie Hoofdcontact

- **THEN** "marja.verbeek@zuiddrecht.example" and "Alle 2 contactpersonen" are 14px under the 15px "Marja Verbeek"

### Requirement: A stacked side list's rows are titled as links in the board look

In the board look, a stacked record list in a detail page's side column SHALL draw each row's title bold, in the link colour and underlined.

#### Scenario: DqOrganisatie Lopende zaken

- **THEN** "Subsidie buurtfeest Oosthaven" is 15px bold, blue and underlined

### Requirement: A wrapping column's secondary line is 14px, 2px under its value in the board look

In the board look, a wrapping table column other than the title column SHALL draw its secondary line at 14px and a normal line height, 2px under the value.

#### Scenario: DqTaken Onderwerp

- **THEN** "2026-4853" is 14px, 2px under "Melding geluidsoverlast terras Markt", and the row is 99px
