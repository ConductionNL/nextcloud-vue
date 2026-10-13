# settings-board-look Delta: screens-admin-settings-board-header

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-admin-settings-board-header](../../)

## Purpose

An admin settings page draws as the Beheer boards do, also where no CnAppRoot provides the look.

## ADDED Requirements

### Requirement: The admin settings header shows the path

Under the board look, CnAdminSettingsShell with `breadcrumbs` SHALL draw them under the title as a breadcrumb
navigation, separated by "/", the last as the current page, followed by "·" and `breadcrumbNote` when set, in place
of the description. Without `breadcrumbs` the description SHALL show as before.

#### Scenario: Launchpad admin

- **GIVEN** a shell with `look: "board"`, title "Launchpad-beheer: algemeen", breadcrumbs Beheerinstellingen (link), Launchpad, Algemeen and note "geldt voor de hele organisatie"
- **WHEN** the page renders
- **THEN** the title is followed by "Beheerinstellingen / Launchpad / Algemeen · geldt voor de hele organisatie", and the Documentatie button sits on the right

### Requirement: A shell told the board look draws it without a CnAppRoot

A CnAdminSettingsShell whose own `look` is `board` SHALL carry the board look class, so its header, grid and cards
take the board look on an admin page that no CnAppRoot wraps.

#### Scenario: Two cards in a row

- **GIVEN** a shell with `look: "board"` on a 1300px page, outside any CnAppRoot, holding two sections
- **WHEN** the page renders
- **THEN** the two sections are cards side by side

### Requirement: A wide section is not capped at 900px

Under the board look, a CnSettingsSection with `wide` SHALL be as wide as its place, without NcSettingsSection's
900px cap on the section, its name or its description.

#### Scenario: The setup banner spans the page

- **GIVEN** the shell above holding a `wide` section
- **WHEN** the page renders at 1300px
- **THEN** the section is wider than 1000px
