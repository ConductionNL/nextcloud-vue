# board-settings-table-flat Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-settings-table-flat](../../)

## Purpose

A settings section is one card, as the admin boards draw it.

## ADDED Requirements

### Requirement: A table in a settings section has no card of its own

In the board look a table inside an admin settings section SHALL have no border and no corner radius of its own. Tables
elsewhere SHALL keep the board table card. The Nextcloud look SHALL be unchanged.

#### Scenario: DqVthInstellingen "Legesregels"

- GIVEN the VTH admin settings in the board look
- THEN the Legesregels table sits on the section card with no second edge around it
