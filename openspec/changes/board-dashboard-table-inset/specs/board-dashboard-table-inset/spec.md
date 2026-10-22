# board-dashboard-table-inset Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-dashboard-table-inset](../../)

## Purpose

A dashboard card's table sits where the boards draw it.

## ADDED Requirements

### Requirement: A board dashboard table sits inside the card's inset

On a board dashboard card a widget table SHALL sit 22px in from the card's sides with 20px below it, and its first and
last columns SHALL keep the table's own 12px cell padding.

#### Scenario: DqTermijnen

- **GIVEN** the "Ingebrekestellingen en dwangsommen" card in the board look
- **THEN** the table's header band starts 22px in from the card's edge and its first heading 12px further in
