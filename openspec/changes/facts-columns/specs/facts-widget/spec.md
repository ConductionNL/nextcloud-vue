# facts-widget Delta: facts-columns

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [facts-columns](../../)

## Purpose

Draw a person's facts as the boards do: two columns, nested fields, an address on one row.

## ADDED Requirements

### Requirement: Facts rows can sit in two columns

With `columns: 2` the facts widget SHALL lay its rows out in two columns with each label above its value, and in one
column below 640px. A row with `parts` SHALL show them joined by its `separator`, and a part that is itself `{ parts,
separator? }` SHALL be joined first. Without `columns` the rows SHALL stay label beside value.

#### Scenario: An address on one row

- **GIVEN** a person with residence street "Parkstraat", number "24", postcode "3421 AB" and city "Zuiddrecht"
- **WHEN** a row joins a street-and-number group, the postcode and the city with ", "
- **THEN** it reads "Parkstraat 24, 3421 AB, Zuiddrecht"
