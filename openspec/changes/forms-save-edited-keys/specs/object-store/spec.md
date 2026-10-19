# object-store Delta: forms-save-edited-keys

**Status**: in-progress
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: An edit writes only the keys it changed

A library edit save of an existing object SHALL send a PATCH carrying only the keys whose value differs from the object as it was loaded. It SHALL send nothing when nothing changed. A key the form does not show SHALL keep its stored value.

#### Scenario: A status form without capacity

- **GIVEN** a status with `capacity: 5`, edited in a form that shows only `name` and `order`
- **WHEN** the reader renames it and saves
- **THEN** the request is a PATCH with `{ name }` only, and the status keeps `capacity: 5`

#### Scenario: Nothing changed

- **WHEN** the reader saves a form without changing anything
- **THEN** no request is sent
