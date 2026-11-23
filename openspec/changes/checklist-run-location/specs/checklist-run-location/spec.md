# checklist-run-location Delta: checklist-run-location

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [checklist-run-location](../../)

## Purpose

A record made in the field says where it was made and how sure the device was, without the user doing anything.

## ADDED Requirements

### Requirement: A field captures where something was recorded

`CnGeoCaptureField` SHALL show a held fix as coordinates, accuracy and time in the `status` role. A fix whose accuracy is above
`goodAccuracy`, or no fix, SHALL say so in words and offer a retry and an address by hand. With `auto` it SHALL ask the device on
mount when it holds no value. A new fix SHALL keep a typed address. A refusal or timeout SHALL NOT raise an error or stop the user.

#### Scenario: A good fix

- **GIVEN** a value with accuracy 12 and `goodAccuracy` 50
- **THEN** the line reads the coordinates, "±12 m" and the time, with no address field

#### Scenario: A rough fix

- **GIVEN** a value with accuracy 200 and `low` true
- **THEN** the line says the location is inaccurate, with a retry and an address field
- **WHEN** the user types an address
- **THEN** the value holds the address beside the fix

### Requirement: An answer carries where it was given

With `content.captureLocation.field`, `CnChecklistRunWidget` SHALL ask the device once when an answer first changes, show the
result under the question, wait for the device before saving the page, and store the place in that field of the answer, whichever
way answers are stored. A rough fix or none SHALL be stored with `low` true and SHALL NOT hold the page. A stored place SHALL show
again when the run is reopened and SHALL NOT be asked for again. Without `captureLocation` the widget SHALL NOT ask the device.

#### Scenario: Board DqInspectie "Locatie bij elk antwoord"

- **GIVEN** `captureLocation` `{ field: "location" }`
- **WHEN** the user answers a question and moves on
- **THEN** the saved answer holds `location` with the coordinates and `low` false

#### Scenario: No signal

- **GIVEN** the device answers no position
- **WHEN** the user answers a question and moves on
- **THEN** the answer is saved with `location` `{ low: true }`

#### Scenario: Without the key

- **GIVEN** no `captureLocation`
- **WHEN** the user answers a question
- **THEN** the device is not asked
