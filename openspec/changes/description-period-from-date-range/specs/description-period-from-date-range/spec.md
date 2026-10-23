# description-period-from-date-range Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [description-period-from-date-range](../../)

## Purpose

A dashboard's description names the period of its date range.

## ADDED Requirements

### Requirement: A dashboard description reads the active date range as a period

A dashboard `description` SHALL replace `{dateRange}` with the dashboard's active date range, read as a period: a
preset with `period: "month"` as the month and year of the range's start, `period: "quarter"` as the quarter's months
("{from} through {to}"), `period: "year"` as the year, any other preset as its translated label, and a custom range as
its dates. Without an active range the token SHALL read as empty. A change of the range SHALL change the text.

#### Scenario: DqDashboard

- **GIVEN** the description "How the team is doing · {dateRange}, all teams you are in" and `dateRange.default`
  `{ preset: "month" }` with the preset `{ id: "month", period: "month" }`
- **WHEN** it is October 2026
- **THEN** the line reads "Hoe het team ervoor staat · oktober 2026, alle teams waar u in zit"

#### Scenario: another preset

- **GIVEN** the same description and the reader picks the preset `{ id: "all", label: "All" }`
- **THEN** the line reads "How the team is doing · All, all teams you are in"
