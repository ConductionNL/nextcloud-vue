# table-strong-title Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [table-strong-title](../../)

## Purpose

A card's list names its rows as the boards draw them.

## ADDED Requirements

### Requirement: A table's title column can read as a strong name

A table with `rowTitle: "strong"` SHALL draw, in the board look, its title column at the cell's size, weight 600, in the
main ink and without an underline, the row staying a link.

#### Scenario: DqZaaktypeStatussen

- **WHEN** an administrator opens the Statussen tab
- **THEN** "Ontvangen" reads 14px 600 without an underline

### Requirement: A swatch maps a stored colour name to its colour

A swatch cell with `format.colorMap` SHALL colour its dot with the map's value for the colour field, and SHALL draw no dot
for a value the map lacks.

#### Scenario: DqZaaktypeStatussen

- **WHEN** a status stores colour `blue`
- **THEN** its name has a dot in the palette's blue
