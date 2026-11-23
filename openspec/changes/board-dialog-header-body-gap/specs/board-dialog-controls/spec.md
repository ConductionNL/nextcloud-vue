# board-dialog-controls Delta: board-dialog-header-body-gap

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-dialog-header-body-gap](../../)

## Purpose

A board dialog's body starts where the dialog boards start it.

## ADDED Requirements

### Requirement: A board dialog's body starts 22px under its header

A board dialog SHALL leave 22px between the bottom of its header (title or subtitle) and the first block of its body.

#### Scenario: DqBerichtVersturen

- **WHEN** a handler opens Bericht naar de Berichtenbox
- **THEN** the BSN label starts 22px under the subtitle's last line
