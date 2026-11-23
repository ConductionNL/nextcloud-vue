# tree-view-reorder Delta: tree-view-reorder

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [tree-view-reorder](../../)

## Purpose

A user orders the rows of a tree with or without a pointer, and hears where a row landed.

## ADDED Requirements

### Requirement: A row moves among its siblings with or without a pointer

With `reorderable` every row of `CnTreeView` SHALL show a drag handle and Move up and Move down buttons. A move by either route SHALL emit `update:nodes` with a new tree that leaves the original nodes untouched, and `move` with `{ node, parentId, from, to, siblings }`.
The status line SHALL say the new position, unless `moveStatus` is set. After a button move focus SHALL stay on that button, or go to the other one at the end of the siblings. A button that would leave the siblings SHALL be disabled. A move button SHALL NOT select the row.

#### Scenario: Board LqCursus, a lesson moves with the keyboard

- **GIVEN** a chapter with three lessons
- **WHEN** the user presses Move down on the first lesson
- **THEN** it stands second, and the other chapter is untouched
- **AND** the status line says "Lesson 1 moved to position 2 of 3."
- **AND** focus stays on its Move down button

#### Scenario: The end of the siblings

- **WHEN** the user presses Move down on the second of three lessons
- **THEN** focus goes to its Move up button, because Move down is now disabled

#### Scenario: Saved

- **GIVEN** a move
- **WHEN** the host sets `moveStatus` to "Saved"
- **THEN** the status line says "Saved"

### Requirement: Without reorderable the tree is unchanged

Without `reorderable` `CnTreeView` SHALL draw no handle, no move button and no status line, and its markup SHALL stay as it was.

#### Scenario: A tree that does not reorder

- **GIVEN** no `reorderable`
- **THEN** no row has a move control
