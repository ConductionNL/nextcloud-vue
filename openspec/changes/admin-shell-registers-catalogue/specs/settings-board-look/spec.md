# settings-board-look Delta: admin-shell-registers-catalogue

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [admin-shell-registers-catalogue](../../)

## Purpose

An admin settings page reads in the user's language without each app remembering to register the library's catalogue.

## ADDED Requirements

### Requirement: An admin page reads in the user's language without the app registering

CnAdminSettingsShell and CnVersionInfoCard SHALL register the library's translation catalogue for the current language
when the page has not registered it yet. A page that already registered it SHALL not register it again.

#### Scenario: A Dutch admin page whose entry never registered the catalogue

- **GIVEN** a Dutch user and an admin entry that never calls `registerTranslations()`
- **WHEN** the shell and its version card render
- **THEN** the version card reads "Naam van de app", "Bijgewerkt" and the footer "Ondersteuning"
