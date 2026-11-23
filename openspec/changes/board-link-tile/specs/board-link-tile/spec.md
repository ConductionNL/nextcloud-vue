# board-link-tile Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-link-tile](../../)

## Purpose

A link tile reads as the boards draw it.

## ADDED Requirements

### Requirement: A board link tile is a rounded card with its icon beside the title

A tile SHALL draw an optional `subtitle` under its title. In the board look a tile SHALL be a card with radius 12px and
20px 22px of padding, its 24px icon beside a 15px title and the 13px subtitle, all left-aligned, without a hover zoom.
Outside the board look the tile SHALL keep its centred layout.

#### Scenario: PtThemas

- **GIVEN** the themes dashboard in the board look with the "Theme catalogue" tile and its subtitle
- **THEN** the tile is a rounded card with the palette icon on the left, "Themacatalogus" beside it and
  "in de Nextcloud-instellingen" under that
