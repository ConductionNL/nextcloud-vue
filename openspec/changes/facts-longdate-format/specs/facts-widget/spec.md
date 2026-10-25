# facts-widget Delta

## ADDED Requirements

### Requirement: A facts entry can write a date with the month spelled out

A facts entry or part with `format: "longdate"` SHALL show its date as day and full month, adding the year only
outside the current year.

#### Scenario: DqContact Historie

- **GIVEN** a record last changed on 3 October of this year
- **THEN** the part reads "3 oktober"
