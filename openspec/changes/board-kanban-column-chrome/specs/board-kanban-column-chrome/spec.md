# board-kanban-column-chrome Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-kanban-column-chrome](../../)

## Purpose

A kanban column's heading, count and show-more button look as the boards draw them.

## ADDED Requirements

### Requirement: A kanban column has the board's heading, count and show-more

In the board look a column heading SHALL use the font's normal line height; its count stays a 12px figure at weight
700 on a 14px line. In every look the show-more button of a cut column SHALL be the dashed 13px
button, not Nextcloud's default button.

#### Scenario: DqWerkbord "Ontvangen 14"

- **GIVEN** the case board in the board look
- **THEN** the heading is 18px high and the count bubble 16px with its figure at 700

#### Scenario: A cut column

- **GIVEN** a column with more cards than its limit
- **THEN** "Toon 12 meer" is a dashed, transparent, 13px button
