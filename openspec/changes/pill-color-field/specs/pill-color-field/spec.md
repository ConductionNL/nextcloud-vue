# pill-color-field Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [pill-color-field](../../)

## Purpose

Pills and menu entries take their tone and icon from the record they point at.

## ADDED Requirements

### Requirement: A pill takes its tone and icon from the referenced record

A detail header pill with `resolve: { register, schema, colorField?, iconField? }` SHALL read those fields off the
referenced record, take the tone `variantForColor` maps the colour onto in place of its own `variant` and `colorMap`,
and show the icon before its label. An empty colour or icon SHALL leave the pill as declared. `variantForColor` SHALL
map the NL Design System hues and their light tints (blue, green, orange, red, purple, teal, grey) onto the badge
tones (info, success, warning, error, purple, teal, default).

#### Scenario: a case's type pill

- **GIVEN** a case page whose `typePill` resolves `caseType` with `colorField: colour` and `iconField: icon`
- **AND** the case type has colour `red` and icon `FileDocumentOutline`
- **THEN** the pill is an error-toned tag with that icon before "Woo-verzoek"

### Requirement: A badge cell takes its tone and icon from the referenced record

An index page `badge` column with `widgetProps.resolve: { colorField?, iconField?, register?, schema? }` SHALL read
those fields for the ids on screen, one batch per column, and each cell SHALL take that record's tone and icon over
the column's `variant` and `colorMap`.

#### Scenario: the team queue's type column

- **GIVEN** a case list with a `caseType` badge column resolving `colour` and `icon`
- **THEN** each row's type tag has its case type's tone and icon

### Requirement: A card pill takes its tone and icon from the referenced record

The board card's pill (`board.card.pill` with `board.card.resolve`) and the record card's head, footer and chip pills
(`cardLayout`, each with `resolve`) SHALL take the tone and icon of the record their field points at, read by the index
page in the same batch as its badge columns. A pill without `resolve` SHALL stay as declared.

#### Scenario: a case on the board

- **GIVEN** a case board whose card pill is `caseType` with `resolve: { colorField: colour, iconField: icon }`
- **THEN** each card's type pill has its case type's tone and icon

### Requirement: A saved view's icon shows in the My views menu

A saved view with an `icon` SHALL show that icon on its My views menu entry; a view without one SHALL keep the filter
icon.

#### Scenario: a pinned case type

- **GIVEN** a case type view with icon `Gavel` added to the menu
- **THEN** its menu entry shows the gavel
