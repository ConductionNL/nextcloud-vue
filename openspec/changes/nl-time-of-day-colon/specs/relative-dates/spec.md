# nl-time-of-day-colon Delta: relative-dates

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [nl-time-of-day-colon](../../)

## Purpose

Write a time of day the same way in every language and app: hours, a colon, minutes.

## ADDED Requirements

### Requirement: A time of day is written with a colon

The library SHALL write a time of day as two-digit hours, a colon and two-digit minutes in every language, Dutch
included, wherever it formats one.

#### Scenario: Today in Dutch

- **GIVEN** a Dutch reader and a moment today at 09:42
- **WHEN** the relative date with its time is written
- **THEN** it reads "vandaag, 09:42"

#### Scenario: A time range in Dutch

- **GIVEN** a Dutch reader and a range from 10:00 to 11:00
- **WHEN** the range is written
- **THEN** it reads "10:00 tot 11:00"
