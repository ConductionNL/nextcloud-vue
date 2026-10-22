# board-task-table-bleed Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-task-table-bleed](../../)

## Purpose

The task table in a detail card runs edge to edge in the board look, its text lined up with the card title.

## ADDED Requirements

### Requirement: A board task table runs edge to edge in its card

In the board look, a `CnTasksWidget` table in a detail card:

- SHALL run under the card's 22px side padding;
- SHALL pad its first and last cells 22px at the outer edge, head cells 10px 12px and body cells 14px 12px;
- SHALL set the task name as one text line.

The Nextcloud look keeps its own table.

#### Scenario: DqZaakTaken "Taken op deze zaak"

- **GIVEN** a case's Taken tab in the board look
- **THEN** the "Taak" column head starts 23px into the card, in line with the card title
- **AND** a task row whose cells fit on one line is 65px tall (64px drawn)
