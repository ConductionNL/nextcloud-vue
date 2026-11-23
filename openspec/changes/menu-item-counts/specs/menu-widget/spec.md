# menu-widget Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [menu-item-counts](../../)

## Purpose

A folder menu says how much each folder holds.

## ADDED Requirements

### Requirement: A menu item can show a count

With `countFrom` a CnMenuWidget item SHALL show a count at the end of its tree row: a register schema's total for
`{ register, schema, filter? }`, or for `{ url, responsePath? }` the endpoint's `total` when it answers one, else the
number of rows at `responsePath`. A failed read SHALL draw no count.

#### Scenario: DqCatalogus

- **GIVEN** "Case types" with `countFrom: { register: "dossiq", schema: "caseType" }` and 14 case types
- **THEN** the row reads "Zaaktypen 14"
