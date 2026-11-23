# board-side-list-rows Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-side-list-rows](../../)

## Purpose

A list in a board side card draws its rows as the boards do.

## ADDED Requirements

### Requirement: A board side card's list draws its rows as the boards do

In the board look, a list in a side card SHALL draw a hairline over every row including the first, its row titles
SHALL carry no underline at rest, and its footer note SHALL be 13px in the muted ink under a theme too.

#### Scenario: DqZaaktypeStatussen "Versies"

- **WHEN** an administrator opens a case type
- **THEN** a hairline separates "Versies" from "Versie 1", "Versie 1" is not underlined, and the note under it is 13px muted
