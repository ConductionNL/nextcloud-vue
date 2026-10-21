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

### Requirement: A pairs value can be chosen from objects

A `pairs` field with `valueSource { register, schema, labelField }` SHALL draw
each value as a select over those OpenRegister objects (label `labelField`,
value the id), show a stored id no object answers by its id, and say when the
register holds more objects than were read.

#### Scenario: Mapping a rostering group

- **GIVEN** cohorts c1 "Group 1A" and c2 "Group 2B", and a row 1A to c1
- **WHEN** the administrator picks "Group 2B" and saves
- **THEN** the section sends 1A to c2
