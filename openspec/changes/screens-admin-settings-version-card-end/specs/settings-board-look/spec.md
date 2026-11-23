# settings-board-look Delta: screens-admin-settings-version-card-end

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-admin-settings-version-card-end](../../)

## Purpose

An admin page can start with the app's own card, as board DcBeheer draws it, and keep re-import and the setup wizard.

## ADDED Requirements

### Requirement: The version card can follow the app's sections

CnAdminSettingsShell SHALL take `versionCardPosition`, `start` or `end`, default `start`. With `start` the version card
and the organisation credential broker SHALL render above the app's sections, as before. With `end` the app's sections
SHALL render first and the version card and the credential broker after them, in the markup, so the keyboard order
follows. The app's sections SHALL render once.

#### Scenario: Decidiq admin page

- **GIVEN** a shell with `look: "board"`, `versionCardPosition: "end"` and an Organisatie section
- **WHEN** the page renders
- **THEN** the Organisatie card comes first in the grid, and the version card with Re-import and Run setup wizard follows it
