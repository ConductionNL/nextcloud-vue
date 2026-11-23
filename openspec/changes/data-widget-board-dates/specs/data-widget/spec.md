## ADDED Requirements

### Requirement: A data widget field can read a date the board way

A data widget field override with `format: 'date'` SHALL show the board's short date, and `format: 'date-long'` SHALL show it with the year.

#### Scenario: case data
- **THEN** Startdatum reads "3 okt 2026"
