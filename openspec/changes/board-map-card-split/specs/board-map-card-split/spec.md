# board-map-card-split Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-map-card-split](../../)

## ADDED Requirements

### Requirement: The board map card splits as the board does

In the board look the map card SHALL give the map a 520px flex basis (grow 3) beside the list's 320px (grow 2), 18px
apart. The Nextcloud look SHALL be unchanged.

#### Scenario: DqZakenKaart

- GIVEN the cases index in the board look, map view, at 1440px
- THEN the map is about 655px wide and the list column about 409px
