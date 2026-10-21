# board-data-card-gap Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-data-card-gap](../../)

## Purpose

A data card's body starts as far below its title as the boards draw it.

## ADDED Requirements

### Requirement: A board data card's body starts 14px below its title

In the board look, a body card on a detail page that holds the data grid SHALL start its body 14px below the title's
glyphs (14px minus `--cn-board-first-line-leading`). A side card SHALL keep its 10px and any other body card its 12px.
The Nextcloud look keeps its own spacing.

#### Scenario: DqZaak "Zaakgegevens"

- **GIVEN** a case detail page in the board look with the "Zaakgegevens" data card
- **THEN** the first label starts 14px (within 0.5px) below the card's title

#### Scenario: DqContact "Bereikbaar via"

- **GIVEN** a contact detail page in the board look with a data card in the side column
- **THEN** its body keeps the side card's 10px below the title
