# board-admin-settings-header-rhythm Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-admin-settings-header-rhythm](../../)

## Purpose

The admin settings header and its tab strip sit where the board puts them.

## ADDED Requirements

### Requirement: The board admin settings header keeps the board's rhythm

In the board look the admin settings header inside the shell SHALL pad 4px at the top and 8px at the bottom with no
bottom margin of its own, its title SHALL take the 40px height of the header buttons, and its crumbs SHALL be 14px on
a normal line height, so the first row under the header starts one grid gap (20px) below it.

#### Scenario: DqInstellingen

- **GIVEN** dossiq's admin settings in the board look
- **THEN** the title and the buttons start 4px under the content's top, the crumbs 6px under the 40px title row
- **AND** the tab strip starts 20px under the header
