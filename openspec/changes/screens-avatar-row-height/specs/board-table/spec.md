# board-table Delta: screens-avatar-row-height

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-avatar-row-height](../../)

## Purpose

An account row is as high as the board draws it.

## ADDED Requirements

### Requirement: A two-line avatar row keeps the board's row height

Under the board look, a table row whose avatar cell shows a second line SHALL be 59px high (a 32px circle, a name line
of 18px and a second line of 16px, 12px above and under), whatever line height the host page sets.

#### Scenario: Nextcloud's line height

- **GIVEN** the host page sets `line-height: 1.5` on the body
- **WHEN** a board table renders a name column with the `avatar` widget and a `secondary` line
- **THEN** the row is 59px high and the circle is 32px
