# description-today-week Delta

**Status**: proposed
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: A template can name a date's week, and a dashboard description can read today

`{path|week}` SHALL read a date as its ISO 8601 week number, "Week {week}". A dashboard `description` SHALL replace
`{today|<format>}` with today's date formatted as a row template formats it.

#### Scenario: DqTermijnen

- **GIVEN** the description "{today|week} · all teams" and a Dutch reader
- **WHEN** it is Wednesday 7 October 2026
- **THEN** the line reads "Week 41 · alle teams"
