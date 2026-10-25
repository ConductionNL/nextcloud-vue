# board-side-lead-gaps Delta

## ADDED Requirements

### Requirement: A board side card starts a stacked list or main contact as drawn

In the board look, a side card holding a stacked record list SHALL start its first row 10px under the title, with no
hairline and no row padding. A side card holding a main contact SHALL start it 12px under the title, with the name and
role at their normal line height.

#### Scenario: DqOrganisatie Lopende zaken

- **GIVEN** an organisation with one open case and the side list set to `density: "stacked"`
- **THEN** the case title starts 10px under the card title

#### Scenario: DqOrganisatie Hoofdcontact

- **GIVEN** an organisation with a primary party
- **THEN** the party's name starts about 15px under the card title, centred on the 40px initials tile
