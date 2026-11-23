# index-page Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [masked-formatter-max-aggregate](../../)

## Purpose

A list column can show a sensitive value masked and the latest of a related value.

## ADDED Requirements

### Requirement: A column can mask its value for display

The `masked` formatter SHALL show all but the last `formatterOptions.visible` (default 4) characters as `*`, at most five
of them, and SHALL leave a value no longer than that unchanged. It SHALL be documented as display only, not an access
control.

#### Scenario: An IBAN

- **GIVEN** a column with `formatter: "masked"` and the value `NL91ABNA0417164300`
- **THEN** the cell reads `*****4300`

### Requirement: A column aggregate can take the highest value

A column `aggregate` with `op: "max"` and `field` SHALL show, per row, the highest `field` among the related objects its
`where` selects, read with one request sorted on `field` descending; with none it SHALL show `zeroLabel`, else a dash.

#### Scenario: Laatste contact

- **GIVEN** `aggregate: { register: "dossiq", schema: "contactmoment", op: "max", field: "meta.at", where: { organisation: "@self.id" } }`
- **THEN** each organisation shows the date of its latest contact moment
