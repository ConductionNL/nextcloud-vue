# board-head-menu-keeps-head-row Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-head-menu-keeps-head-row](../../)

## Purpose

A menu in a board table's head does not make the head row taller than the board draws it.

## ADDED Requirements

### Requirement: A board head menu keeps the head row height

In the board look a menu in the row-actions column's head of a board table SHALL take the 22px head control size of the
column filter funnels. The menus SHALL keep working; the Nextcloud look SHALL be unchanged.

#### Scenario: PqTaken with the header filter menu

- **GIVEN** an index page with `filterMenu` and a side panel in the board look
- **THEN** the filter menu in the row-actions head is 22px high and the head row is as high as its labels make it
