# object-table Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [object-table-row-id-field](../../)

## Purpose

A table row can open another record than itself.

## ADDED Requirements

### Requirement: A row can link to the record a field names

With `rowIdField` an object table SHALL open `rowRoute` with the id held at that dot-path of the row, and SHALL not link
a row whose field is empty. Without `rowIdField` it SHALL use the row's own id.

#### Scenario: DqTermijnen payments

- **GIVEN** a payments table with `rowRoute: "CaseDetail"` and `rowIdField: "case"`
- **WHEN** the user clicks a payment row whose `case` is `case-9`
- **THEN** the case page for `case-9` opens
