# dashboard-page Delta: dashboard-table-reference-labels

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [dashboard-table-reference-labels](../../)

## Purpose

A dashboard table shows referenced objects by name.

## ADDED Requirements

### Requirement: A dashboard table shows a referenced object's label

An `object-table` column with `labelField` or `resolve` and no cell `widget` SHALL show the label of the object its
value references: `resolve.labelField`, else `labelField`, else `name`, then the store's usual fallbacks. The target
SHALL be `resolve.register` / `resolve.schema` when given, else the register and schema the source schema's `$ref` names
for that property. Without a target the column SHALL show the raw value. Any other column SHALL render as before.

#### Scenario: The customer named by resolve

- **GIVEN** a column `{ "key": "customerId", "labelField": "legalName", "resolve": { "register": "shillinq", "schema": "CustomerMaster" } }`
- **WHEN** an invoice row holds a customer id
- **THEN** the cell reads the customer's `legalName`, not the id

#### Scenario: The target read off the schema

- **GIVEN** a column `{ "key": "payerId", "labelField": "legalName" }` and the invoice schema's `payerId` has a `$ref`
- **WHEN** the table renders
- **THEN** the cell reads the referenced object's `legalName`
