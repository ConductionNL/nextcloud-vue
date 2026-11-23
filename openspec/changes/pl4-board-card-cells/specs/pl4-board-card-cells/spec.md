# pl4-board-card-cells Delta: pl4-board-card-cells

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [pl4-board-card-cells](../../)

## Purpose

A board card draws its fields the way a table draws its cells.

## ADDED Requirements

### Requirement: A card field can be a cell

A card field named in `cardCells` SHALL be drawn through CnCellRenderer with its `widget`, `widgetProps` and
`formatter`, the card as its row. A field without a cell config SHALL be drawn as text, as before.

#### Scenario: A lead's priority

- **GIVEN** `cardFields: ["priority"]` and `cardCells: { priority: { widget: "badge", widgetProps: { colorMap: { high: "warning" } } } }`
- **THEN** a high-priority lead's card shows a warning badge reading its priority
