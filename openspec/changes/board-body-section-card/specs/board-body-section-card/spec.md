# board-body-section-card Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-body-section-card](../../)

## Purpose

A body section drawn in a card reads as every board card.

## ADDED Requirements

### Requirement: A board body section card is drawn as a board card

In the board look a CnBodySections section with `card: true` SHALL be padded `--cn-board-card-padding` with radius
`--cn-board-card-radius`, and its title SHALL be `--cn-board-heading-size`, weight 700, at line height `normal`, with no
rule under it and 14px above the body.

#### Scenario: PqKlant "Contactmoment registreren"

- **GIVEN** a client page in the board look
- **THEN** the "Contactmoment registreren" card title is 17px at 700, 23px in from the card's edge, with no rule under it

### Requirement: A board body section card's labelled buttons are 40px

In the board look a labelled button in a CnBodySections card SHALL be `--cn-board-control-height` tall. A menu toggle
and an icon-only button keep their size.

#### Scenario: PqKlant "Annuleren" and "Opslaan"

- **GIVEN** a client page in the board look
- **THEN** the contact moment card's "Annuleren" and "Opslaan" and the messages card's "Bericht versturen" are 40px tall
