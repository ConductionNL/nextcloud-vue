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
