# board-map-layers-button Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-map-layers-button](../../)

## ADDED Requirements

### Requirement: The base-map switch is a named board button

A map with more than one base map SHALL name its switch "Map layers" (nl "Kaartlagen") as title and accessible name. In the board look the switch SHALL be a 36px square with the board's control edge and radius, 12px in from the top left, around an 18px layers icon in the main ink.

#### Scenario: DqZakenKaart

- GIVEN the case map with two base maps
- THEN a 36px "Kaartlagen" button stands 12px in from the map's top left
