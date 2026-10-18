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

The section SHALL have one Save button, enabled only while a field differs from what was loaded or last saved, with "Unsaved changes" beside it. Save SHALL send the changed fields, one request per save target carrying that target's fields (fields without their own target to `saveUrl`, default `url`, with `saveMethod`, default `PUT`), then say "Saved." as a status message, or why a target did not save as an alert (naming its fields when there are several targets), and emit `saved` or `save-error`. A target that failed SHALL keep its fields unsaved.

#### Scenario: Changing the address

- **WHEN** the administrator changes the address and presses Save
- **THEN** one PUT carries the address and the section reads "Saved."

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

### Requirement: A field can read and save elsewhere

A field with its own `url` SHALL be read from that endpoint, at its `valuePath` (default its key), and saved to its `saveUrl` (default that `url`) with `saveMethod` (default `POST`) under `saveKey` (default its key). `saveParams` SHALL be merged into the body of its target's request, and a target under `/ocs/` SHALL be requested outside `index.php` with the `OCS-APIRequest` header. Each distinct read target SHALL be read once. When a field's own target cannot be read, the field SHALL say so and be left out of the save, and the rest of the section SHALL work.

#### Scenario: A brand card over two apps

- **GIVEN** the organisation name read from and saved to the theming app, and the app name from the app's own settings
- **WHEN** both change and Save is pressed
- **THEN** one request goes to the theming app with `{ name }` and one to the app with `{ appName }`

### Requirement: An image field uploads at once

An `image` field SHALL show the image at its value's url, or up to two initials (`initials`, or the value of the `initialsFrom` field) when there is none, labelled by its label. Its button SHALL upload a chosen file at once as multipart form data to `uploadUrl` (the file under `uploadField`, default `image`, plus `uploadParams`), take the new url from the answer at `uploadValuePath` (or `previewUrl` with a cache buster), and show it. An image SHALL not be part of Save, and an upload failure SHALL say why under the field.

#### Scenario: Another logo

- **WHEN** the administrator uploads a logo
- **THEN** it is posted with `key=logo` and the tile shows the new logo
