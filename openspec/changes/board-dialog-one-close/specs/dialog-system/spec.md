# dialog-system Delta: board-dialog-one-close

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-dialog-one-close](../../)

## Purpose

A board dialog has one close button however it is opened.

## ADDED Requirements

### Requirement: A board dialog shows one close button

A dialog in the board look SHALL show only the board header's close button, also when it is opened with `spawnDialog`
and NcButton's stylesheet loads after the library's.

#### Scenario: The generate invoices wizard

- **GIVEN** a `CnWizardDialog` with `look="board"` opened with `spawnDialog`, and NcButton's display rule loaded after the library stylesheet
- **WHEN** the dialog opens
- **THEN** one close button is visible, and it closes the dialog
