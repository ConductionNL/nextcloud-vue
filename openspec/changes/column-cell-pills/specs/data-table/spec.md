# data-table Delta: column-cell-pills

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [column-cell-pills](../../)

## ADDED Requirements

### Requirement: A column can put a pill beside a cell's value

A table column MAY declare `pills`, each `{ field, <condition>, label, variant? }` with the row-indicator condition
grammar. For every pill whose condition holds on the row, the cell SHALL draw a status pill with the translated label
and the variant beside its value, on the same line in the board look. A pill whose condition does not hold SHALL NOT
be drawn.

#### Scenario: DqContacten

- **GIVEN** the BSN column with `pills: [{ field: "indicatieGeheim", equals: true, label: "Data protection", variant: "warning" }]`
- **AND** Bram Smit with `indicatieGeheim: true`
- **THEN** his BSN cell reads "*****4054" with the pill "Geheimhouding" beside it
