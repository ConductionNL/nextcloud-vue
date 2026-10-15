# settings-board-look Delta: version-card-dutch-and-header

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [version-card-dutch-and-header](../../)

## Purpose

The admin chrome reads in the reader's language, and no button covers a card title.

## ADDED Requirements

### Requirement: The admin chrome reads in the reader's language

The version card's field labels and update button, the admin shell's titles, support footer and action labels, and the register mapping's column head, busy states and errors SHALL be translated through the library catalogue, with Dutch entries in `l10n/nl.json`. An app's `labels` on the version card SHALL replace only the labels it names.

#### Scenario: Pipelinq for a Dutch reader

- **GIVEN** the reader's language is Dutch
- **THEN** the version card reads "Naam van de app", "Versie", "Ingestelde versie" and "Bijgewerkt", the footer reads "Ondersteuning", and the register mapping's column reads "Soort object"

### Requirement: No header button covers a card title

Under the board look a settings section whose header carries actions SHALL lay out its title and the actions side by side so a long title wraps beside them, and in a card narrower than 520px SHALL put the actions under the title and description. No button SHALL overlap the card title.

#### Scenario: A register mapping in half the grid

- **GIVEN** a register mapping with a long title, a save and a re-import button, in half of the admin grid
- **THEN** neither button overlaps the title
