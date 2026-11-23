# object-list-table-frame Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [object-list-table-frame](../../)

## Purpose

A detail card's object list can draw its table in a frame, as the Pipelinq POS and lead boards draw it.

## ADDED Requirements

### Requirement: An object list can frame its table in its card

`CnObjectListWidget` SHALL take `content.tableFrame`. When it is `true`, in the board look on a detail page:

- the table SHALL have a 1px frame in the border colour with an 8px radius, inside the card's padding;
- the head SHALL be on the main background with a 1px rule under it;
- the first and last cells of the head and of each row SHALL pad 18px at the outer edge;
- each row SHALL have a 1px rule under it, except the last row.

Only a literal `true` SHALL turn it on. Without it the table SHALL draw as before. The Nextcloud look is unchanged.

#### Scenario: PqKassabon "Regels"

- **GIVEN** a POS receipt in the board look, its lines list declaring `tableFrame: true`
- **THEN** the lines table has a 1px frame with an 8px radius
- **AND** the "Omschrijving" head starts 18px inside the frame, on a white head with a rule under it

#### Scenario: DqTenant "Mandaten"

- **GIVEN** an object list without `tableFrame`
- **THEN** its table draws as before, without a frame
