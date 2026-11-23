# form-dialog Delta: form-field-options-from

**Status**: in-progress
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: A select field can read its options from a source

A form field with `optionsFrom` (or a schema property with `x-options-from`) SHALL render as a select over the rows of that source, or a multiselect for an array field. The value of an option SHALL be read at `valueField` (default `id`, else the uuid) and its label at `labelField` (default `title`, else `name`). The form SHALL store the value and show a held value by its label.

#### Scenario: Picking a taakveld

- **GIVEN** a field with `optionsFrom: { register: 'dossiq', schema: 'taakveld', valueField: 'code', labelField: 'name' }`
- **WHEN** the form opens
- **THEN** the select offers each taakveld by its name, in the register's order
- **AND** choosing "Bestuur" stores `0.1`

#### Scenario: Editing a held value

- **GIVEN** an object whose taakveld is `2.1`
- **WHEN** the edit form opens
- **THEN** the select shows "Verkeer, wegen en water"

#### Scenario: Searching

- **WHEN** the reader types "brand"
- **THEN** only options whose label or value holds it remain, without another read of the source
