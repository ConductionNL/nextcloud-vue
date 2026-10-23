# slot-grid Delta: slot-grid

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [slot-grid](../../)

## Purpose

The objects of one schema laid out as a grid of a row value and a column value, added per cell, from configuration.

## ADDED Requirements

### Requirement: Objects are laid out by two fields and added per cell

The `slot-grid` widget SHALL read every object of `content.source`, page by page, and lay each out in the row of its
`rowFields` values and the column of its `columnField` value, rows sorted by those values and columns in the order of
`content.columns`. An object holding a value in `skipWhenField`, or whose column value is not a column, SHALL be left
out. An item SHALL show `itemLabelField`, as a Nextcloud user's display name when `itemLabelKind` is `user`. A cell's
add button SHALL open the source schema's create form with the cell's row and column values filled in, and the grid
SHALL be read again after a create. An item SHALL be removed only after a confirm, and the grid read again.

#### Scenario: A coordinator adds standby to a cell

- **GIVEN** standby slots on Monday and Tuesday from 08:00 to 09:00
- **WHEN** the coordinator presses the add button in the Monday 08:00 cell
- **THEN** the create form opens with weekday Monday, 08:00 and 09:00 filled in

#### Scenario: No item is hidden past a page

- **GIVEN** more slots than one page holds
- **WHEN** the grid loads
- **THEN** it reads every page and shows every slot
