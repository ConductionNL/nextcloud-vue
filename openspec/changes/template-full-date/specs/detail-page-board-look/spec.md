## ADDED Requirements

### Requirement: A template can write a date in full

A template token `{path|fulldate}` SHALL write the date at `path` with its long weekday, day, long month and year in the user's language, with the first letter capitalised. A value that is not a date SHALL write nothing.

#### Scenario: an event's start
- GIVEN an event that starts on 12 November 2026 and a Dutch user
- WHEN the header line `{startAt|fulldate}` is filled
- THEN it reads "Donderdag 12 november 2026"
