# settings-board-look Delta: board-version-card-full-width

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-version-card-full-width](../../)

## Purpose

The version card spans the admin settings grid under the board look, as the boards draw it.

## ADDED Requirements

### Requirement: The board version card spans the settings grid

Under the board look CnVersionInfoCard SHALL render as a wide settings section, spanning the whole settings grid, unless it is told `wide: false` (on the shell: `versionCardWide: false`). Without the board look it SHALL render as before.

#### Scenario: larpinq's admin page

- **GIVEN** CnAdminSettingsShell in the board look with its version card and two sections
- **WHEN** the page renders
- **THEN** the version card spans the whole width of the grid

#### Scenario: An app that keeps the card in the grid

- **GIVEN** CnAdminSettingsShell in the board look told `versionCardWide: false`
- **WHEN** the page renders
- **THEN** the version card takes one column of the grid, as before
