# object-list-table-bleed Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [object-list-table-bleed](../../)

## Purpose

A detail card's object list says whether its table runs edge to edge in the card, as some boards draw it.

## ADDED Requirements

### Requirement: An object list can run its table edge to edge in its card

`CnObjectListWidget` SHALL take `content.tableBleed`. When it is `true`, in the board look on a detail page:

- the table SHALL run under the card's 22px side padding, without a border of its own;
- the table's first and last cells SHALL pad 22px at the outer edge, so the column text lines up with the card title.

Without `tableBleed: true` the table SHALL stay inside the card's padding. The Nextcloud look is unchanged.

#### Scenario: DqZaakContact "Contactmomenten op deze zaak"

- **GIVEN** a case's Contact tab in the board look, its contact moments list declaring `tableBleed: true`
- **THEN** the "Datum" column head starts 23px into the card, in line with the card title

#### Scenario: DqTenant "Mandaten"

- **GIVEN** an organisation page whose mandates list does not declare `tableBleed`
- **THEN** its table stays inside the card's padding

#### Scenario: A bleed table with nothing under it closes its card

- **GIVEN** a case page whose contact moments list declares `tableBleed: true` and shows no pager, view all link, footnote, summary or total
- **THEN** the table runs through the card's 20px bottom padding to the card's bottom edge, and its last row's outer corners follow the card's radius
- **AND** a bleed list with a pager, a link or a footnote under its table keeps the card's bottom padding

### Requirement: The lines under a bleed table stand as drawn

In the board look the lines under a bleed object list table on a detail page SHALL stand at the font's normal leading: the summary 12px under the table, a footnote under the summary 12px under it, and the footer links row at normal leading.

#### Scenario: DqZaakGerelateerd Deelzaken
- **GIVEN** the case's Deelzaken card with two sub-cases
- **THEN** "(0/2 voltooid)" starts 12px under the table and the footnote 12px under it, and the card is as tall as the board draws it

#### Scenario: DqZaakGerelateerd Objecten
- **GIVEN** the case's Objecten card
- **THEN** the "Objecttypen beheren" row is one line at normal leading, 12px under the table
