# register-mapping-select-grid Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [register-mapping-select-grid](../../)

## Purpose

A register mapping can be drawn as the plain form a settings board draws.

## ADDED Requirements

### Requirement: The board look can draw the schemas as a grid of selects

With `boardLayout: "selects"` in the board look, CnRegisterMapping SHALL draw per group the register select and, once a
register is chosen, one schema select per type labelled with the type, three to a row, and one save button after the
groups. It SHALL NOT draw the group card, the status chip or the type table. Without it the board look SHALL draw the
type table as before.

#### Scenario: DqBeheerinstellingen

- **GIVEN** one group with seven schema types and `boardLayout: "selects"`
- **THEN** the section shows Register, then seven labelled schema selects three to a row, then Opslaan
