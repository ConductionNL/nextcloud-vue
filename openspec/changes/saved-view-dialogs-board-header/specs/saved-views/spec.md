# saved-views Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [saved-view-dialogs-board-header](../../)

## Purpose

The saved-view dialogs look like the other board dialogs.

## ADDED Requirements

### Requirement: The saved-view dialogs are board dialogs

The saved-view edit, share and presentation dialogs SHALL render through CnDialog, so that under the board look they draw
the board dialog header with its round close button.

#### Scenario: DqFilterBewerken

- **GIVEN** the edit-view dialog in the board look
- **THEN** its close control is the board's 36px round button
