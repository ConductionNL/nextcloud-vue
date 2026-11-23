# dialog-system Delta: board-dialog-top

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-dialog-top](../../)

## Purpose

Place board dialogs where the boards draw them.

## ADDED Requirements

### Requirement: A board dialog is top-aligned above a phone

Above 600px a board-look dialog SHALL sit with its top edge `--cn-dialog-top` (default 88px) below the top of the
screen, not centred. At 600px and below it SHALL stay the bottom sheet.

#### Scenario: Desktop

- **GIVEN** a board CnDialog at 1440x900
- **WHEN** it opens
- **THEN** its container's top is at 88px
