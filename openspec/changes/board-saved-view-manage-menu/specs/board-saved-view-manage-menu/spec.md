# board-saved-view-manage-menu Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-saved-view-manage-menu](../../)

## Purpose

A saved view's manage menu and its place in the app menu read as the boards draw them.

## ADDED Requirements

### Requirement: A saved view's manage menu is the board's menu

In the board look a saved view's manage menu SHALL be 264px wide, with rows of at least 40px padded 6px 10px, the icon
12px before a 14px label at 600, an explanation in 12px muted text at 400, a separator before Delete and Delete in the
error red.

#### Scenario: DqFilterInMenu

- **GIVEN** the cases list's saved views panel in the board look
- **WHEN** the reader opens "Beheer Termijn deze week"
- **THEN** the menu lists Edit, Update with current filters (refresh icon), Share, Save a copy, Remove from menu, a
  separator and Delete in red

### Requirement: An own view can be copied

The owner of a saved view SHALL be offered "Save a copy" in its manage menu. The copy SHALL be named "{name} (copy)";
a copy of a shared or default view keeps the view's name.

#### Scenario: Copy an own view

- **GIVEN** the reader owns "Wacht op inwoner"
- **WHEN** they choose Save a copy
- **THEN** a personal view "Wacht op inwoner (kopie)" with the same query is created

### Requirement: A view in the app menu is marked

In the board look the panel SHALL draw a 14px pin before the name of a view that is in the app menu, and the row's
accessible name SHALL end in ", in the menu" in every look.

#### Scenario: DqFilterBeheren

- **GIVEN** "Termijn deze week" is in Pieter's menu
- **THEN** its panel row starts with a pin and is announced as "Termijn deze week, in het menu"

### Requirement: The row whose menu is open is marked

In the board look the saved view row whose manage menu is open SHALL be drawn as the applied view's row: on the primary
tint with its name in the deep primary ink.

#### Scenario: DqFilterBeheren

- **GIVEN** the panel in the board look with no view applied
- **WHEN** the reader opens "Beheer Wacht op inwoner"
- **THEN** the "Wacht op inwoner" row is tinted and its name is in the deep primary ink
