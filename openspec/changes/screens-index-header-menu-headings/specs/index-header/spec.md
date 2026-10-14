# index-header Delta: screens-index-header-menu-headings

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-index-header-menu-headings](../../)

## Purpose

The header Actions menu can group its entries under headings, as the boards do.

## ADDED Requirements

### Requirement: The header Actions menu can draw group headings and separators

An `items` entry `{ "heading": "<i18n key>" }` SHALL draw a group heading (translated through the host translate) and
the entry `"separator"` SHALL draw a rule, each at its place in `items`. A heading or rule SHALL be drawn only when an
entry follows it before the next rule or the end, a rule SHALL never open the menu, and two rules in a row SHALL be one.
A menu whose items leave only marks SHALL not be drawn. Plain string items SHALL render as before.

#### Scenario: The board's groups

- **GIVEN** `items` is `[{ "heading": "Ga naar" }, "calendar", "agenda", "separator", "import", "separator", { "heading": "Selectie" }, "copy-selected", "delete-selected", "separator", "refresh", "documentation"]`
- **WHEN** the person opens the Acties menu
- **THEN** it draws the heading "Ga naar" over the two links, a rule, Import, a rule, the heading "Selectie" over the two selection entries, a rule, Refresh and Documentation

#### Scenario: An empty group

- **GIVEN** a group whose entries are all left out (no documentation URL, an unknown id)
- **WHEN** the menu is drawn
- **THEN** that group's heading and rule are not drawn
