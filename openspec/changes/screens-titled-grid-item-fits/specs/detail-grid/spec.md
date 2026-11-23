# detail-grid Delta: screens-titled-grid-item-fits

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-titled-grid-item-fits](../../)

## Purpose

A titled card on a detail page fits its grid cell.

## ADDED Requirements

### Requirement: A titled grid widget fits its cell

When the detail page draws a heading above a widget in a grid cell, the heading and the widget together SHALL fit the
cell: the widget SHALL take the height the heading leaves, and the cell SHALL NOT overflow because of the heading.

#### Scenario: Two cell heights

- **GIVEN** two titled custom widgets whose content fills its container, in cells of 4 and 7 rows
- **WHEN** the page renders
- **THEN** neither cell overflows and each widget ends at its cell's bottom edge
