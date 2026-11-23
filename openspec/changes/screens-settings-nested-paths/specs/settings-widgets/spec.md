# settings-widgets Delta: screens-settings-nested-paths

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-settings-nested-paths](../../)

## Purpose

The settings widgets configure and save a field that sits inside an object, and settings that an app endpoint owns.

## ADDED Requirements

### Requirement: A settings widget writes a nested field as its enclosing top-level object

When a configured field is a dot-path, the widget SHALL re-read the object, merge the changed leaf into the enclosing
top-level object and send ONE PATCH of that top-level object. Fields without a dot SHALL be written as before, without
a re-read.

#### Scenario: A nested sign-up policy

- **GIVEN** `authentication.registration.policy` is "approval" and the server also holds `authentication.registration.contact`
- **WHEN** the person chooses "open"
- **THEN** one PATCH sends `authentication` with `registration.policy` "open" and `registration.contact` unchanged

#### Scenario: A form with a nested and a top-level field

- **WHEN** both fields changed and the form is saved
- **THEN** one PATCH carries the enclosing object and the plain field

### Requirement: A settings widget can write through an app endpoint

When `content.save` holds a `url`, the widget SHALL send the write to that url with `method` (default PATCH) and
`payload` (default the changed values as a nested object) after filling `{value}`, `{field}`, `{changes}` and
`{object.<path>}`, and SHALL NOT PATCH the object.

#### Scenario: A sign-in method

- **GIVEN** `save` = `{ url: "/apps/x/api/portals/{object.slug}/signin", method: "PUT", payload: { method: "{field}", enabled: "{value}" } }`
- **WHEN** a switch is turned off
- **THEN** one PUT goes to the filled url with `enabled` false as a boolean, and no PATCH goes to the object

### Requirement: A chips field refuses to go under its minimum

A `chips-field` with `minItems` (or `required`, meaning 1) SHALL refuse removing an entry that would leave fewer than `minItems`, SHALL show the translated `minItemsMessage` (default "Keep at least {count}.") and SHALL send nothing.

#### Scenario: The last language

- **GIVEN** a chips field with `required: true` holding one language
- **WHEN** the person removes it
- **THEN** the chip stays, the message shows and no request is sent

### Requirement: A settings-form field has a default

A `settings-form` field with `default` SHALL show the default when the object holds no value for it, and the next Save SHALL write it.

#### Scenario: Header variant never saved

- **GIVEN** `default: "double"` and no stored value
- **WHEN** the form renders and is saved
- **THEN** "double" shows and one PATCH carries it

### Requirement: A chips field belongs to the settings form's one Save

A `settings-form` field of type `chips` SHALL keep its list in the form: adding or removing a chip SHALL send nothing, the list SHALL join the changed-fields PATCH of Save when it differs from the stored list, and a Save under `minItems` SHALL be refused before any write.

#### Scenario: Languages with the name

- **WHEN** a name is edited and a language chip is added, then Save is pressed
- **THEN** one PATCH carries both fields
