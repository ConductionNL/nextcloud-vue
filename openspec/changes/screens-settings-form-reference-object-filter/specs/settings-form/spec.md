# settings-form Delta: screens-settings-form-reference-object-filter

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-settings-form-reference-object-filter](../../)

## Purpose

A reference field can list only the objects that belong to the record being edited.

## ADDED Requirements

### Requirement: A reference field's filter can name the record being edited

A `reference` field's `filter` values `@objectId` and `@object.<field>` SHALL resolve to the edited record's id and that
field's value before the list is read. While a token has no value on the record the list SHALL NOT be read; when the
record changes the resolved query the list SHALL be read again, and never twice for the same query.

#### Scenario: The logos of this portal

- **GIVEN** a logo field with `filter: { "portal": "@objectId" }` on portal `p-1`
- **WHEN** the form loads
- **THEN** the list is read with `portal=p-1`

#### Scenario: The record arrives later

- **GIVEN** `filter: { "organisation": "@object.organisation" }` and a record without `organisation`
- **WHEN** the record gains `organisation: "org-7"`
- **THEN** the list is read once with `organisation=org-7`
