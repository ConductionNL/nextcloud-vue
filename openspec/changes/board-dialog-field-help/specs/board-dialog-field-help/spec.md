# board-dialog-field-help Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-dialog-field-help](../../)

## Purpose

A board dialog's field help reads as the boards draw it.

## ADDED Requirements

### Requirement: A board dialog field's help line is 13px muted under the control

In a board dialog the help line of an NcTextField or NcTextArea SHALL be 13px in the muted ink,
4px under the control, with no side inset. (Its leading is set by board-dialog-help-normal-leading.) Outside the board look Nextcloud's own help line SHALL stay.

#### Scenario: PtUitnodigen

- **GIVEN** the invite dialog in the board look
- **THEN** "De uitnodiging met een eenmalige code gaat naar dit adres." under the e-mail field is 13px, muted and starts
  at the field's left edge
