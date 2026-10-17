# user-settings-board-dialog

**Status**: proposed
**Scope**: nextcloud-vue

## Purpose

Draw the user settings dialog as the board draws it, without taking the sections away from the app.

## ADDED Requirements

### Requirement: The user settings dialog takes the board look

Under the board look CnAppRoot SHALL draw the user settings in CnUserSettingsDialog: the eyebrow ("Your account"
unless `userSettingsEyebrow` is set), the title, the subtitle ("Only for you. Colleagues keep their own settings."
unless `userSettingsSubtitle` is set), a navigation that lists every registered NcAppSettingsSection in its order with
its icon and marks one current (`aria-current="true"`), and a footer with "Changes are saved straight away · <app>"
and a Close button that closes the dialog. In the Nextcloud look CnAppRoot SHALL keep NcAppSettingsDialog.

#### Scenario: Sections in the navigation

- **GIVEN** the board look and two app sections, "Email and calendar" (order 1) and "Availability" (order 2)
- **WHEN** the dialog opens
- **THEN** the navigation lists "Email and calendar" then "Availability", the first current, and a click moves the mark

#### Scenario: The Nextcloud look is unchanged

- **GIVEN** no look
- **WHEN** the dialog opens
- **THEN** CnAppRoot draws NcAppSettingsDialog
