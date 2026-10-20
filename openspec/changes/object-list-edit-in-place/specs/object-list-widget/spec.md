# object-list-widget Delta: object-list-edit-in-place

**Status**: in-progress
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: A list can edit a row in its own form

An object list with `editable: true` SHALL offer an Edit row action that opens its form filled with the row, and SHALL save it as a PATCH of the keys the form changed, writing nothing when nothing changed.

#### Scenario: Renaming a status keeps its capacity

- **GIVEN** a status with capacity 5, in a list whose form does not show capacity
- **WHEN** the reader renames it and saves
- **THEN** the request is a PATCH with the new name only, and the status keeps capacity 5

### Requirement: A select can follow another field

A select whose `optionsFrom` names `@answer.<key>` SHALL be read with that field's value and read again when it changes, SHALL keep only the rows `where` matches, read its options from `itemsPath`, and with `hideWhenEmpty` be left out while there are none.

#### Scenario: Formats of a property type

- **GIVEN** the format select reads the vocabulary's formats of `@answer.propertyType`
- **WHEN** the reader picks the type `string`, then `integer`
- **THEN** it offers email and uri, then is left out
