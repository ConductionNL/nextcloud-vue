# board-card-rhythm-r34 Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-card-rhythm-r34](../../)

## ADDED Requirements

### Requirement: Three-column facts are ruled

In the board look, facts in three columns (`columns: 3`) SHALL draw each fact as its label 3px over a 500-weight value, with 10px and a hairline under it. Two-column facts stay plain.

#### Scenario: DqSociaalDomein De melding

- GIVEN the case "Melding Jeugdwet gezin Oosthaven" in the board look
- THEN Zaaktype, Grondslag, Gemeld door, Onderzoek klaar, Regisseur and Gezinsplan each have a hairline under their value

### Requirement: A side stacked row keeps the board's gaps

In the board look, a row of a stacked side list (`density: "stacked"`) SHALL draw its meta line 4px under the title and its pill and date 10px under the meta.

#### Scenario: DqOrganisatie Lopende zaken

- GIVEN the organisation "Buurtvereniging Oost" in the board look
- THEN the "Lopende zaken" card is 138px tall, as the board

### Requirement: The main contact's lines read at normal leading

In the board look, the main contact's e-mail and its link to all contact persons SHALL read at the font's normal line height, and the e-mail SHALL read in the ink colour without an underline until it is hovered or focused.

#### Scenario: DqOrganisatie Hoofdcontact

- GIVEN the organisation "Buurtvereniging Oost" in the board look
- THEN the "Hoofdcontact" card is 170px tall, as the board

### Requirement: An appointment row is as tall as drawn

In the board look, an appointment's meta line SHALL read at the font's normal line height, and an appointments card in the page body SHALL start its first row 8px under its title row.

#### Scenario: DqTaak Afspraken

- GIVEN the task "Hoorzitting inplannen" in the board look
- THEN the appointment row is 60px tall and its title 41px under the card title, as the board

### Requirement: A title and its lines are one block

In the board look, in a side card, the lines (`as: "line"`) right under a facts title SHALL stand 2px under the line above, not the card's 10px between facts.

#### Scenario: DqTaak Zaak

- GIVEN the task "Hoorzitting inplannen" in the board look
- THEN "2026-4836 · Bezwaar" stands 2px under the case title
