# board-menu-tree-rows Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-menu-tree-rows](../../)

## Purpose

A tree menu on a card in the board look draws the boards' folder list.

## ADDED Requirements

### Requirement: A board tree menu draws the board's folder rows

In the board look a `CnMenuWidget` in the `tree` style SHALL draw each row with 8px block and 10px inline padding, an
8px corner and 15px text, rows 2px apart, inside a card padded 14px. A row's label SHALL keep the row's ink without a
text decoration, also under a theme that paints every link. The caret column SHALL be left out when no row has
children. With `activeItemHighlight: "background"` the open row SHALL draw on `--color-primary-element-light` in
`--color-primary-element-light-text` at weight 700.

#### Scenario: Catalogue folders

- **GIVEN** dossiq's Catalogue page on Object types in the board look
- **THEN** "Zaaktypen", "Kenmerken", "Sjablonen" and "Objecttypen" are rows without underlines
- **AND** "Objecttypen" is drawn on the primary tint, as on board DqCatalogus
