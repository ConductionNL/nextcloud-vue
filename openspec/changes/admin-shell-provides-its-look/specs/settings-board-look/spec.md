# settings-board-look Delta: admin-shell-provides-its-look

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [admin-shell-provides-its-look](../../)

## Purpose

CnAdminSettingsShell hands the look it is drawn in to its version card and to the app's sections.

## ADDED Requirements

### Requirement: The admin settings shell hands its look to what it holds

CnAdminSettingsShell SHALL provide the look it resolves (its own `look` prop, else the injected `cnLook`, else `nextcloud`) as `cnLook`, so its CnVersionInfoCard and any component in its slots that follows `cnLook` SHALL draw in the shell's look without the app providing one.

#### Scenario: An admin page with no CnAppRoot

- **GIVEN** an admin settings page with no CnAppRoot, and CnAdminSettingsShell told `look: "board"`
- **WHEN** the shell renders its version card
- **THEN** the version card draws the board facts and footer

#### Scenario: No look

- **GIVEN** CnAdminSettingsShell with no `look` and no provided `cnLook`
- **WHEN** it renders
- **THEN** the version card draws the Nextcloud look, as before
