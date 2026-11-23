# board-map-missing-card Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-map-missing-card](../../)

## Purpose

The map view's missing-address card looks as the board draws it.

## ADDED Requirements

### Requirement: The board map view's missing-address card is drawn as the board draws it

In the board look, the map view's missing-address card SHALL set its title at 15px on its normal line height, and SHALL
draw its "show them in the table" button as a link flush with the title: no padding, border or minimum height, 14px
weight 600. The Nextcloud look keeps its own card.

#### Scenario: DqZakenKaart

- **GIVEN** the cases map view in the board look with cases that have no location
- **THEN** the card's title is 15px, the table link starts 15px into the card and about 9px under the title
