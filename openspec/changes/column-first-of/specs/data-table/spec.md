# data-table Delta: column-first-of

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [column-first-of](../../)

## Purpose

A cell can fall back to another field when its own is empty.

## ADDED Requirements

### Requirement: A cell shows the first field that has a value

A column with `firstOf` SHALL show, in each row, the value of the first listed field that holds a value other than an
object. When none does the cell SHALL read as empty. The object list SHALL pass `firstOf` and `secondaryLabels` on to the
table.

#### Scenario: An older quote line

- **GIVEN** the Product column with `firstOf: ["name", "product.name", "description"]`
- **WHEN** a line has no name, no extended product and the description "Ontwerp en bouw"
- **THEN** its Product cell reads "Ontwerp en bouw"
