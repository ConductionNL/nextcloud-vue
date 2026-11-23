# object-list-widget Delta: list-reorder-order-field

**Status**: in-progress
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: A list can be reordered by its order field

An object list with `reorder: { field }` SHALL show its rows in that field's order, let the reader move a row by dragging it or with Move up and Move down, renumber the rows, and write only that field, as a PATCH, on the rows whose number changed. It SHALL read out the row's new place, or the server's refusal, and SHALL start a new row last.

#### Scenario: Moving a status

- **GIVEN** statuses Intake (1, capacity 5), In behandeling (2), Afgerond (3)
- **WHEN** the reader moves In behandeling down
- **THEN** Afgerond gets order 2 and In behandeling order 3 by PATCHes of `order` alone, and Intake is not written and keeps capacity 5

### Requirement: An order is unique among its siblings

A form field with `unique` SHALL refuse, when the reader saves, a value another stored object already has among the objects its filter matches, showing the clash on the field.

#### Scenario: Two statuses with order 2

- **GIVEN** a status with order 2 in the same case type
- **WHEN** the reader saves another status with order 2
- **THEN** the form shows "Order is already used; choose another value." and does not save
