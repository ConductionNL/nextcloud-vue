# app-root Delta: app-shown-name-in-chrome

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [app-shown-name-in-chrome](../../)

## Purpose

Name the app as readers know it in the app's own chrome, without moving the stored pane width.

## ADDED Requirements

### Requirement: The app chrome shows the app's localised name

CnAppRoot SHALL name the app in the user settings dialog, the setup wizard and the credentials section with `appDisplayName` or the manifest's `name` through the app's translate, else the name Nextcloud's app menu shows, else the id with a capital. NcContent's `appName` SHALL keep its untranslated value, because it keys the stored list-pane width.

#### Scenario: dossiq without a display name

- **GIVEN** CnAppRoot with `appId: "dossiq"`, no `appDisplayName`, no manifest `name`, and Nextcloud's app menu naming dossiq "Zaken"
- **WHEN** the reader opens the user settings dialog
- **THEN** the dialog names the app "Zaken", and the list-pane width is stored under the same key as before

### Requirement: The user settings navigation is not underlined

The user settings dialog's navigation links SHALL draw no underline, also on hover and when visited, under a theme that underlines links with `!important`.

#### Scenario: thematiq

- **GIVEN** a theme rule `a { text-decoration: underline !important }`
- **WHEN** the user settings dialog opens
- **THEN** its navigation links are not underlined
