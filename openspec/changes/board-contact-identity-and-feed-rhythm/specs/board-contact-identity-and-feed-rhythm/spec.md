# board-contact-identity-and-feed-rhythm Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-contact-identity-and-feed-rhythm](../../)

## Purpose

The contact boards' "Identiteit" and "Bereikbaar via" side cards and the contact-moment feed keep the rhythm the
boards draw.

## ADDED Requirements

### Requirement: A side lead card with rows keeps the rows rhythm

In the board look a side CnFactsWidget that opens on a lead and also holds rows SHALL start 10px under its title and
keep 10px between the lead, the rows and what follows them. An inline row SHALL keep 10px to the next row, and its
button SHALL take no vertical margin.

#### Scenario: DqContact "Identiteit"

- **GIVEN** the lead "Geïdentificeerd met controlevragen", the BSN row with its Tonen button, Geheimhouding and Bron
- **THEN** the lead starts 10px under the title, the BSN row 10px under the lead, Geheimhouding 10px under the BSN row
- **AND** the card is 270px tall

### Requirement: A side text keeps 8px to its link

In the board look a side CnFactsWidget that opens on a text followed by its link SHALL keep 8px between them, the
link taking no leading above it. A card that opens on a lead keeps the lead card's 12px.

#### Scenario: DqContact "Woonadres"

- **GIVEN** the address on two lines and the link "Zaken op de kaart"
- **THEN** the link starts 8px under the address and the card is 138px tall

### Requirement: A side facts action is 34px with no vertical margin

In the board look a side CnFactsWidget's action SHALL be 34px tall and take no vertical margin.

#### Scenario: DqContact "Bereikbaar via"

- **GIVEN** the action "Contact vastleggen" under the last-contact line
- **THEN** the action is 34px tall and starts 10px under the line, and the card is 203px tall

### Requirement: A feed sets its lines on the normal line

In the board look a CnRecordListWidget feed SHALL set each row's meta line and text on the normal line height, 3px
apart, and keep 4px between rows.

#### Scenario: DqContact "Laatste contactmomenten"

- **GIVEN** three contact moments
- **THEN** each row is 61px tall including its hairline and the rows start 65px apart
