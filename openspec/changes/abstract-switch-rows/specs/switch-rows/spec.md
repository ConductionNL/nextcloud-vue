# switch-rows Delta: abstract-switch-rows

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [abstract-switch-rows](../../)

## Purpose

A card of labelled switches bound to boolean fields of the current object, from configuration.

## ADDED Requirements

### Requirement: Switch rows draw one switch per configured boolean field

The `switch-rows` widget SHALL draw one row per `content.rows` entry with a switch, a label and an optional hint, the
switch on when `objectData[key]` is true (when false for a row with `invert`).

#### Scenario: Verkeer meten

- **GIVEN** a row `trafficEnabled` with a hint and the field true
- **WHEN** the widget renders
- **THEN** the switch is on and the hint shows under the label

### Requirement: A toggle saves that one field

A toggle SHALL PATCH only that row's field (the opposite value for `invert`), SHALL disable that switch while the
request runs, and SHALL return the switch to its last saved state and show the server's message when the PATCH is
refused. `readOnly` SHALL disable every switch.

#### Scenario: A refused toggle

- **WHEN** the server refuses the PATCH
- **THEN** the switch is back as stored and the server's words show
