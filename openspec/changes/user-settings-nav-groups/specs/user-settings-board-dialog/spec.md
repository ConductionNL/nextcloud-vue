# user-settings-board-dialog Delta: user-settings-nav-groups

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [user-settings-nav-groups](../../)

## Purpose

Draw the board user settings navigation and headings as DqPersoonlijkeInstellingen does.

## ADDED Requirements

### Requirement: The board user settings navigation can list Nextcloud's own sections first

With `nextcloudLinks` (`[{ label, section? | href?, icon? }]`) the board user settings dialog SHALL list those entries
first as links (`section` opens `/settings/user/<section>`), then an entry named after the app, then the app's
registered sections under it. An entry without a label or a target SHALL be skipped. Without `nextcloudLinks` the
navigation SHALL list the sections as before.

#### Scenario: Dossiq's personal settings

- **GIVEN** links Personal info (section personal-info) and Privacy (href /settings/user/privacy), and the app Dossiq with one section
- **WHEN** the dialog opens
- **THEN** the navigation lists Personal info and Privacy as links, then "Dossiq", with the section under it marked current

### Requirement: A section icon stands before its heading

A section's `#icon` SHALL also render before the section's heading, hidden from assistive tech, and again after the
section is renamed.

#### Scenario: Heading icon

- **GIVEN** a section "Case types in my menu" with an icon
- **WHEN** the dialog opens
- **THEN** the icon stands in the navigation entry and before the heading
