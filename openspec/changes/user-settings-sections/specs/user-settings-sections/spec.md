# user-settings-sections Delta

## Purpose

An app adds its own sections to the user settings dialog without losing the
library's, and draws exactly the sections its board draws.

## ADDED Requirements

### Requirement: The user settings dialog keeps its default sections next to the app's own

`CnAppRoot` SHALL draw the user settings dialog's sections in the order of
the `userSettingsSections` prop, out of the keys `app`, `notifications`,
`credentials`, `walkthrough` and `integrations`, and SHALL NOT draw a key the
list leaves out. Unknown keys SHALL be ignored and a repeated key drawn once.
The content of the `#user-settings-sections` and `#user-settings` slots SHALL
always be drawn: at the place of `app`, or first when the list has no `app`.
Without the prop, the dialog SHALL draw `app` and every default section when
the app fills `#user-settings-sections` or no slot, and only `app` and
`integrations` when the app fills the older `#user-settings` slot. Each
section keeps its own condition: the walkthrough only for an enabled tour,
the integrations only when the manifest declares integration entries.

#### Scenario: An app adds a section and keeps the defaults

- **GIVEN** an app fills `#user-settings-sections` and passes no `userSettingsSections`
- **WHEN** the user settings dialog opens
- **THEN** it draws the app's sections, then notifications, credentials, walkthrough and integrations
- @e2e exclude section order inside a dialog, covered by `tests/components/CnAppRoot.userSettingsSections.spec.js`

#### Scenario: A board without notifications and integrations

- **GIVEN** an app passes `userSettingsSections: ["app", "credentials", "walkthrough"]`
- **WHEN** the user settings dialog opens
- **THEN** it draws the app's sections, credentials and the walkthrough, and no notifications pane or integrations section
- @e2e exclude section order inside a dialog, covered by `tests/components/CnAppRoot.userSettingsSections.spec.js`

#### Scenario: An app on the older slot renders as before

- **GIVEN** an app fills `#user-settings` and passes no `userSettingsSections`
- **WHEN** the user settings dialog opens
- **THEN** it draws the app's content and the integrations section, as before this change
- @e2e exclude the unchanged default, covered by `tests/components/CnAppRoot.userSettingsSections.spec.js`
