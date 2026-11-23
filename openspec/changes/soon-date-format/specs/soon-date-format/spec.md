# soon-date-format Delta: soon-date-format

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [soon-date-format](../../)

## Purpose

A template can say when a coming moment is due, as a call list says it.

## ADDED Requirements

### Requirement: A template reads a coming moment as when it is due

`{path|soon}` SHALL read a moment today as its time of day, tomorrow as "tomorrow", yesterday as "yesterday", two to
six days ahead as the weekday, and any other day as the board's short date, in the user's language. A value that is
not a date SHALL read as empty.

#### Scenario: Board PqDashboard Terugbelverzoeken

- **GIVEN** callbacks due today at 13:00, tomorrow and on Wednesday, on a Monday
- **WHEN** the row's trailing text is `{deadline|soon}`
- **THEN** they read "13.00", "morgen" and "woensdag" in Dutch
