# board-view Delta: board-column-colour-map

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-column-colour-map](../../)

## Purpose

A board column built from referenced rows can draw a stored palette name as a theme colour.

## ADDED Requirements

### Requirement: A column colour can be mapped to a CSS colour

With `source.colorMap` on a `columnFields` entry, a column whose colour, after the merge, is a key of the map SHALL be
drawn in that key's CSS colour. `neutralColor` SHALL compare the stored colours, before the map applies. A colour the
map does not list, an empty mapping, and a board without `colorMap` SHALL draw as before.

#### Scenario: A merged column draws the mapped colour

- **GIVEN** "In behandeling" is merged from a grey row and an orange row, with `neutralColor: "grey"`
- **AND** `colorMap` maps "orange" to `var(--nl-color-orange, #e17000)`
- **THEN** the column dot is drawn in `var(--nl-color-orange, #e17000)`

#### Scenario: A light tint draws a dot

- **GIVEN** "Ontvangen" is coloured "grey-light" and `colorMap` maps it to `var(--nl-color-grey-light, #f0f0f0)`
- **THEN** the column dot is drawn in #f0f0f0 where the theme sets no token
