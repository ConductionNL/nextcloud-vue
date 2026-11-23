# index-page Delta

## ADDED Requirements

### Requirement: A column can show stored values through a display map

The `valueMap` formatter SHALL show the label `formatterOptions.map` gives a stored value, and the stored value
when the map does not name it.

#### Scenario: DqOrganisaties Rechtsvorm

- **GIVEN** a column with formatter `valueMap` and map `{ "Besloten Vennootschap": "BV" }`
- **THEN** "Besloten Vennootschap" reads "BV" and "Stichting" reads "Stichting"
