# board-card-title-gap Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-card-title-gap](../../)

## Purpose

A card's body starts as far below its title as the boards draw it.

## ADDED Requirements

### Requirement: A board card's body starts the board's gap below its title

In the board look, a card title on a detail page (body and side cards), on a `CnDetailCard` and on a dashboard card
SHALL have line height `normal`. The space between the title and the card's body SHALL be the board's gap (12px, 10px on
a detail side card) minus `--cn-board-first-line-leading` (0.15em), the half-leading Nextcloud's 1.5 line height puts
above the body's first line. The Nextcloud look keeps its own title and spacing.

#### Scenario: DqZaak "Het verzoek"

- **GIVEN** a case detail page in the board look with a body card titled "Het verzoek"
- **THEN** the first line of its text starts 12px (within 0.5px) below the title's glyphs

#### Scenario: DqContact "Bereikbaar via"

- **GIVEN** a contact detail page in the board look with a side card titled "Bereikbaar via"
- **THEN** the first line of its body starts 10px (within 0.5px) below the title's glyphs

### Requirement: The data card's grid keeps the board's gap and cell padding

In the board look the data card's grid SHALL keep its 12px 24px gap and each cell its `0 0 10px` padding, whatever
order the component's scoped styles load in.

#### Scenario: DqZaakLocatie "Zaakgegevens"

- **GIVEN** a case detail page in the board look with the "Zaakgegevens" data card
- **THEN** the first label starts 12px (within 0.5px) below the card's title, not 8px lower
