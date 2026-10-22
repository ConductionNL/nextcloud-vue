# board-attention-row Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-attention-row](../../)

## Purpose

A row that waits for a decision stands out as the boards draw it.

## ADDED Requirements

### Requirement: A board table row marked for attention is tinted warm

In the board look a table row carrying the class `cn-row--attention` (through `config.rowClass`) SHALL draw its cells on
a warm tint: 4% of the warning colour over the main background. Without the class, or outside the board look, the row
SHALL keep its ground.

#### Scenario: PtToegangsverzoeken

- **GIVEN** the access requests index in the board look with `rowClass` marking `state` `pending` as `cn-row--attention`
- **THEN** the open requests' rows are drawn on the warm tint and the decided ones on white
