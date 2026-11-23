## ADDED Requirements

### Requirement: A days input can be set as a date

A transition input with `dateField` SHALL draw an editable date under it whose value is today plus the input's days. A
chosen date SHALL set the days to the whole days from today, at least 1. Without days the date SHALL be empty.

#### Scenario: suspend a case until a date
- **GIVEN** the suspend act with days 14 on 7 Oct
- **WHEN** the handler changes "De zaak komt terug op" from 21 Oct to 27 Oct
- **THEN** the days become 20 and the act posts 20 days
