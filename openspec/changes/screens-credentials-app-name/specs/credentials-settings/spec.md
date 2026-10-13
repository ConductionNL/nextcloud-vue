# credentials-settings Delta: screens-credentials-app-name

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-credentials-app-name](../../)

## Purpose

The credentials copy names the app as people know it.

## ADDED Requirements

### Requirement: The credentials copy shows the app's display name

The credentials section SHALL name the app by the given display name when that is not empty and not the app id, else
by the name of the app in Nextcloud's app menu, else by the app id with a capital. It SHALL NOT show the bare app id.

#### Scenario: An app without a display name

- **GIVEN** the section is mounted with app id "launchpad" and the name "launchpad"
- **AND** Nextcloud's app menu lists the app as "Startpagina"
- **WHEN** the section renders
- **THEN** the heading reads "What Startpagina uses"

#### Scenario: An app the menu does not list

- **GIVEN** app id "launchpad" and no menu entry
- **WHEN** the section renders
- **THEN** the heading reads "What Launchpad uses"
