# board-party-tile-soft-ink Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-party-tile-soft-ink](../../)

## ADDED Requirements

### Requirement: A party tile's initials take the soft ink

In the board look the initials in a CnObjectPartiesWidget party tile SHALL take the boards' soft text colour (`--cn-board-text-soft`), as every party's initials on the boards do.

#### Scenario: DqZaakBetrokkenen Rollen

- GIVEN the case "Verlichting fietspad Lindelaan" on its Betrokkenen tab in the board look
- THEN the Rollen card's initials SV, JW and BL are drawn in #3d4047, as the board
