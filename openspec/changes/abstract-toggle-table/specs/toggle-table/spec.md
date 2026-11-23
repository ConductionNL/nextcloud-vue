# toggle-table Delta: abstract-toggle-table

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [abstract-toggle-table](../../)

## Purpose

Rows from a configured list or a source, each with a switch bound to the current object, from configuration.

## ADDED Requirements

### Requirement: A toggle table draws rows from a list or a source

The `toggle-table` widget SHALL draw `content.rows` followed by the rows read from `content.source`, each with a title,
an optional hint, the configured extra columns and a switch. The switch SHALL be on when the row's own field
(`bind.mode: flag`) is true, or when the row's key is in `objectData[bind.field]` (`bind.mode: list`), the opposite
with `bind.invert`. An empty table SHALL show `emptyText`.

#### Scenario: Zaaktypen die inwoners zien

- **GIVEN** a source of case types, a list field of hidden case types holding "c3", and `invert`
- **WHEN** the widget renders
- **THEN** "c3" is off and every other case type is on

### Requirement: A toggle saves one field

A toggle SHALL PATCH only one field: the row's own field with the new boolean (flag mode), or the list field with the
row's key added or removed (list mode). A refused PATCH SHALL show the server's message and leave the switch as stored.
`readOnly` SHALL disable every switch.

#### Scenario: Hiding a case type

- **WHEN** the person switches "c1" off
- **THEN** the PATCH carries the hidden list with "c1" added
