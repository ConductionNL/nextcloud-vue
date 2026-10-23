# board-view Delta: board-declared-states

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-declared-states](../../)

## Purpose

A page can say which columns its board draws for a status field, in which order, under which names.

## ADDED Requirements

### Requirement: A board can declare the states its columns come from

`config.board.states`, for the `statusField`, and `config.board.columnFields[].states`, for that column field, SHALL
be an array of values or `{ key, label?, color?, hidden?, closed? }` entries. When one is present for the active
column field, the board SHALL draw its columns from it, in its order, instead of from the field's enum or lifecycle
states. An entry with `hidden: true` SHALL draw no column; its cards SHALL land in the "Elsewhere" column. An entry
with `closed: true` SHALL start folded. A column field with a `source` or `kind: values` SHALL ignore `states`.
Without `states` the board SHALL read the field's enum or lifecycle states as before.

#### Scenario: Tickets by status

- **GIVEN** the ticket status enum `new, in_progress, awaiting_customer, resolved, completed, rejected, converted, closed`
- **AND** `board.states` `["new", "in_progress", "awaiting_customer", { "key": "completed", "label": "Finished" }, { "key": "converted", "closed": true }, { "key": "rejected", "closed": true }, { "key": "resolved", "hidden": true }, { "key": "closed", "hidden": true }]`
- **WHEN** the tickets list opens in board view
- **THEN** it draws New, In progress, Waiting for customer, Finished, then Converted and Rejected folded, and no Resolved or Closed column

#### Scenario: No declared states

- **GIVEN** a board without `states`
- **WHEN** it opens
- **THEN** its columns are the field's enum values, as before
