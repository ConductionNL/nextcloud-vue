# stage-bar-dates Delta: screens-stage-bar-dates-parity

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-stage-bar-dates-parity](../../)

## Purpose

The process bar's date lines as the DqZaak board draws them.

## ADDED Requirements

### Requirement: A bar date reads as the board draws it

Under the board look, the bars variant of the stages widget SHALL render a
step's `dateField` value that parses as a date in the board's short form (day
and short month in the user's language, the year only outside the current
year). The current step's date SHALL read through the library string
`since {date}` (Dutch "sinds {date}"). A value that is not a date SHALL show as
written. Without the board look every value SHALL show as written.

#### Scenario: The DqZaak process bar

- **GIVEN** a case in its second status, stage rows with the dates the statuses were reached, under the board look, for a Dutch user in 2026
- **WHEN** the bars render
- **THEN** the first step reads "3 okt" and the current step "sinds 4 okt"

@e2e include Read the process bar on dossiq/DqZaak once the stages endpoint returns the reached dates.

#### Scenario: Without the board look

- **GIVEN** the same rows without the board look
- **WHEN** the bars render
- **THEN** each date line shows its value as written
