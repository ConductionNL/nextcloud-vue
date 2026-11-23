# board-text-field-control Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-text-field-control](../../)

## Purpose

Text fields match the board select.

## ADDED Requirements

### Requirement: A board text field is the board's control

In the board look a text field and a textarea SHALL draw a 1px edge in the control colour and no shadow, the index side
panel's text fields SHALL be 40px tall, and a multiple select SHALL draw its edge on its toggle with a bare search box.

#### Scenario: DqZakenSorteren

- **GIVEN** the case list's side panel in the board look
- **THEN** its search field is 40px tall with a 1px #828a95 edge
