# board-kanban-show-more Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-kanban-show-more](../../)

## Purpose

The kanban's show-more button matches the board.

## ADDED Requirements

### Requirement: A board column's show-more button is drawn as the board draws it

In the board look a kanban column's show-more button SHALL draw its label in the soft ink, its dashed edge in the
control colour, and 6px of side padding.

#### Scenario: DqWerkbord

- **GIVEN** a column with more cards than it shows, in the board look
- **THEN** "Toon 12 meer" is #3d4047 on a dashed #828a95 edge
