# switch-rows Delta: screens-switch-value-map

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-switch-value-map](../../)

## Purpose

A switch can stand for a flag that is not stored as a boolean.

## ADDED Requirements

### Requirement: A switch can read and write a value map

A switch in `switch-rows` (a row's `values`, else the widget's) or a `settings-form` `switch` field with
`values: { on, off }` SHALL show on when the stored value equals `on` (compared as text) and SHALL write `on` or `off`.
`invert` SHALL still flip what is shown. Without `values` a switch SHALL read only `true` as on and write a boolean.

#### Scenario: An app config flag

- **GIVEN** a row `{ key: "publicVoting", values: { on: "1", off: "0" } }` and a stored `"1"`
- **WHEN** the person turns the switch off
- **THEN** the switch showed on, and the widget writes `"0"`
