# board-mail-row-initials-size Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-mail-row-initials-size](../../)

## Purpose

A linked mail's initials tile is the board's 32px circle all the way through, not a 32px box around a 36px tile.

## ADDED Requirements

### Requirement: A linked mail's initials tile is 32px inside and out

In the board look the NcAvatar of a linked mail row SHALL set its own size variable and its line height to 32px, so
the initials tile inside it and the initials' line are 32px, as the root is.

#### Scenario: DqZaakEmail "Aanvulling op Woo-verzoek"

- **GIVEN** the linked mail from Sanne de Vries
- **THEN** its "SV" initials stand in a 32px round tile, 32px tall
