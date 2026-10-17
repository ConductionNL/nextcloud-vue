# settings-fields-section Delta: settings-fields-section

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [settings-fields-section](../../)

## Purpose

An admin section that is a form over the app's settings is declared, not written.

## ADDED Requirements

### Requirement: A section declared as fields reads and saves the app's settings

`CnSettingsFieldsSection` SHALL read `url` (default `/apps/<appId>/api/settings`), take each field's value from the answer (at `valuesPath` when set; a dotted key reads a nested value), and draw the fields with `CnSettingsField` in `columns` columns (1 to 3, stacked in a narrow card; a `wide` field spans them). Every field SHALL have a visible label tied to its control; a select SHALL be labelled through NcSelect's `inputLabel`.

#### Scenario: Opening the section

- **GIVEN** a section with the fields baseUrl, apiKey (secret) and mode (select)
- **THEN** it reads `/apps/myapp/api/settings` and shows the address and the mode, and not the key

### Requirement: One save per section with a dirty state

The section SHALL have one Save button, enabled only while a field differs from what was loaded or last saved, with "Unsaved changes" beside it. Save SHALL send every field of the section in one request (`saveMethod`, default `PUT`, to `saveUrl`, default `url`), then say "Saved." as a status message, or why it did not save as an alert, and emit `saved` or `save-error`.

#### Scenario: Changing the address

- **WHEN** the administrator changes the address and presses Save
- **THEN** one PUT carries the section's fields and the section reads "Saved."

### Requirement: A failing field says why

Before sending, Save SHALL check `required`, `pattern` (with `patternMessage`), and a number's `min` and `max`. A failing field SHALL carry `aria-invalid`, show its message in place of its hint, tied to the control with `aria-describedby`; the first failing field SHALL take focus and nothing SHALL be sent.

#### Scenario: An address without https

- **GIVEN** `pattern: "^https://"` and `patternMessage: "Starts with https://"`
- **WHEN** the address is `http://plain.example` and Save is pressed
- **THEN** the field reads "Starts with https://" and no request is made

### Requirement: A secret is replace-only

A `secret` field SHALL never show the stored value. When the settings hold one, its input SHALL say "Stored. Type a new value to replace it."; it SHALL be sent only when something was typed, and SHALL be empty again after a save. A required secret that is stored SHALL pass the check.

#### Scenario: Replacing the API key

- **WHEN** the administrator types a new key and saves
- **THEN** the key is sent once and the input is empty and says it is stored
