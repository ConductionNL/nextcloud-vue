# data-table Delta: template-cell-is-text

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [template-cell-is-text](../../)

## ADDED Requirements

### Requirement: A template cell shows its filled line as text

A table column with a `template` SHALL show the filled line as text. The schema type or format of the column's key
SHALL NOT format that line again.

#### Scenario: PqContactmomenten

- **GIVEN** the column `{ key: "occurredAt", template: "{occurredAt|relativetime}" }` over a `date-time` property
- **AND** a contact moment at 09:42 today
- **THEN** the cell reads "vandaag, 09:42", not "—" and not a date in 2001
