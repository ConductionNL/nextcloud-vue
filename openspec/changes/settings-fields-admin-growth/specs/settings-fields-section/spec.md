# settings-fields-section Delta: settings-fields-admin-growth

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [settings-fields-admin-growth](../../)

## Purpose

An admin page can declare links into the app, guarded actions, removable
secrets and rows whose values are records.

## ADDED Requirements

### Requirement: An action can open a page or ask first

An `action` field with `href` SHALL render a link to that address (with
`target` when given) and SHALL post nothing. An action with `confirm` SHALL ask
the question first and SHALL post only after a yes; closing the question SHALL
count as no. `params` SHALL be sent with the posted fields.

#### Scenario: Rotating a key

- **GIVEN** an action with `confirm: 'Rotate the key?'` and `params: { confirm: 'true' }`
- **WHEN** the administrator presses it and says no, then presses it and says yes
- **THEN** nothing is posted the first time, and `{ confirm: 'true' }` is posted the second time

### Requirement: A stored secret can be removed

A `secret` with `clearable` SHALL offer a "Remove the stored value" switch while
a value is stored. While it is on, the input SHALL be disabled and the section
SHALL be dirty; the save SHALL send `clearKey: true`, or the key with an empty
value when there is no `clearKey`, and the field SHALL then read as not stored.

#### Scenario: Removing a token

- **GIVEN** a stored token with `clearKey: 'clearToken'`
- **WHEN** the administrator switches removal on and saves
- **THEN** the section sends `clearToken: true` and no longer offers removal

### Requirement: Opening hours are a field

A `week-hours` field SHALL draw one row per day of `days` (default Monday to
Sunday, named in the user's language) with an Open switch and, while open, an
opening and a closing time, and hold `{ <day>: { opens, closes } | null }`. A
save SHALL refuse a day that closes before it opens or misses a time.

#### Scenario: Opening on Saturday

- **GIVEN** opening hours with Saturday closed
- **WHEN** the admin opens Saturday and saves
- **THEN** Saturday is saved as 08:00 to 17:00 with the other days unchanged

### Requirement: An action can refresh the section

An action with `reload` SHALL read the section again after it succeeded. An
action's `url` SHALL never be read. A status text SHALL format `{name|date}` as
a date in the user's language.

#### Scenario: Rotating a key shows the new fingerprint

- **GIVEN** a status note on `configured` and a rotate action with `reload`
- **WHEN** the rotation succeeds
- **THEN** the note shows the new fingerprint

### Requirement: A pairs value can be chosen from objects

A `pairs` field with `valueSource { register, schema, labelField }` SHALL draw
each value as a select over those OpenRegister objects (label `labelField`,
value the id), show a stored id no object answers by its id, and say when the
register holds more objects than were read.

#### Scenario: Mapping a rostering group

- **GIVEN** cohorts c1 "Group 1A" and c2 "Group 2B", and a row 1A to c1
- **WHEN** the administrator picks "Group 2B" and saves
- **THEN** the section sends 1A to c2
