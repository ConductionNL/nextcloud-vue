# detail-page Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [detail-pill-resolve](../../)

## Purpose

A header pill names a referenced record by its label.

## ADDED Requirements

### Requirement: A header pill can show a referenced record's label

With `resolve: { register, schema, labelField? }`, a field pill SHALL show the label of the record whose id its field
holds, read with the library's reference-label resolver, and SHALL use that label as its colour key. While the lookup
runs, and when it finds nothing, the pill SHALL show the raw value.

#### Scenario: The case type pill

- **GIVEN** `typePill: { field: "caseType", resolve: { register: "dossiq", schema: "caseType", labelField: "title" } }`
- **AND** a case whose `caseType` is the id of the case type titled "Woo-verzoek"
- **THEN** the pill reads "Woo-verzoek"
