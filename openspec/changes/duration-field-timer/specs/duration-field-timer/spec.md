# duration-field-timer Delta: duration-field-timer

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [duration-field-timer](../../)

## Purpose

A user measures a length while it happens, can correct it by typing, and sees it against a norm.

## ADDED Requirements

### Requirement: A duration field can run as a clock

With `timer`, `CnDurationField` SHALL show the time as a clock with Start, Stop and Reset. While running it SHALL write the time into `modelValue`
every second, counted from the start moment. Stop SHALL write the final time and emit `stopped`. Start SHALL carry on from the time shown. Reset SHALL stop
the clock and write `null`. Without `timer` the field SHALL draw its number and unit as before.

#### Scenario: A form saved mid-run holds the time

- **GIVEN** a field with `timer` that started 5 seconds ago
- **THEN** `modelValue` was last written as `PT5S`

#### Scenario: A throttled tab stays right

- **GIVEN** a running clock whose interval fires late, 90 seconds after it started
- **THEN** the next write is `PT1M30S`

#### Scenario: Reset clears the value

- **GIVEN** a running clock
- **WHEN** the user presses Reset
- **THEN** the clock stops and `modelValue` is written as `null`

### Requirement: A user can type over the clock

With `timer`, the field SHALL read `6` as minutes, `04:23` as minutes and seconds, and `1:04:23` with hours. A typed length SHALL stop the clock and stay.
Text that is no length SHALL show an error and write nothing.

#### Scenario: Typing while it runs

- **GIVEN** a running clock
- **WHEN** the user types `04:23`
- **THEN** the clock stops and `modelValue` is written as `PT4M23S`

#### Scenario: Text that is no length

- **WHEN** the user types `soon`
- **THEN** the field shows an error and `modelValue` is not written

### Requirement: A clock can start by itself on an empty field

With `timer` and `autoStart`, the field SHALL start the clock when it holds no value. It SHALL NOT start on a field that holds a value.

#### Scenario: A new record

- **GIVEN** `timer`, `autoStart` and no value
- **THEN** the clock runs when the field mounts

#### Scenario: A saved record

- **GIVEN** `timer`, `autoStart` and the value `PT6M`
- **THEN** the clock does not run and shows `06:00`

### Requirement: A clock can show the time against a norm

With `timer` and `norm`, the field SHALL show the time, the norm and a percentage, in words and as a bar named by those words. From `normWarningPercent` (80 by default) it
SHALL say the time is close to the norm, and from 100 that it is over the norm, so the state does not depend on colour. The bar SHALL stay at 100 past the norm.

#### Scenario: Board PqWerkplekKlant "Gesprekstijd 03:00 van 05:00"

- **GIVEN** `norm` `PT5M`, `normLabel` "Gesprekstijd" and the value `PT3M`
- **THEN** the line reads "Gesprekstijd 03:00 of 05:00" with 60% and no warning words

#### Scenario: Over the norm

- **GIVEN** `norm` `PT5M` and the value `PT6M`
- **THEN** the line says it is over the norm, reads 120% and the bar stands at 100 in its error state
