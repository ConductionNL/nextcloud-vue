# saved-view-icon-description-count Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [saved-view-icon-description-count](../../)

## Purpose

A saved view reads in the menu as Ruben drew it: its own icon, its description on hover, and how many objects it holds.

## ADDED Requirements

### Requirement: A saved view has an icon and a description

The save and edit dialogs SHALL offer a description and an icon. The icon SHALL be one of a fixed list of icons the
menu can draw; choosing the menu's default stores none. A view's icon SHALL show before its My views menu entry and its
description SHALL be that entry's tooltip. A default view SHALL take its icon and description from config.

#### Scenario: Edit a view

- **GIVEN** Pieter edits "Termijn deze week"
- **WHEN** he chooses the clock icon and types "Mijn zaken met een termijn binnen 7 dagen"
- **THEN** its menu entry shows the clock, and pointing at it shows the text

### Requirement: A saved view in the menu shows its count

A saved view's My views entry SHALL show the number of objects its criteria match, read through the menu's own counters
and refreshed as they are. A view whose `overrides.badge` is `false` SHALL show none.

#### Scenario: Count

- **GIVEN** "Termijn deze week" matches 3 cases
- **THEN** its menu entry ends with a pill reading 3
