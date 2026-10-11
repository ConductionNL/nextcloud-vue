# progress-cell Delta: abstract-progress-cell

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [abstract-progress-cell](../../)

## Purpose

A built-in table cell for a score or a share, so a list column like PqLeads' Winkans is configuration.

## ADDED Requirements

### Requirement: A progress cell draws a toned bar with its percentage

A column with `widget: "progress"` SHALL draw a bar filled to the cell's percentage and the percentage in bold beside
it. The percentage SHALL be the value (else the first `widgetProps.fallbackFields` row field holding a number) as a
share of `widgetProps.max` (default 100), rounded and clamped to 0..100; with no number the cell SHALL show a dash.
The tone SHALL be success at or above `thresholds.good` (default 60), warning at or above `thresholds.warn` (default
30), error below; `lowerIsBetter` SHALL turn the scale around.

#### Scenario: Win chance

- **GIVEN** a lead with `qualificationScore: 22`
- **WHEN** the list renders the Winkans column
- **THEN** the bar is 22% filled and the cell reads "22%" in the error tone

### Requirement: A progress cell can carry an age badge

With `widgetProps.badge` `{ label, dateField?, afterDays, when?, tone? }` the cell SHALL show a badge when the row's
`dateField` (default `@self.updated`) lies `afterDays` or more days back and every `when` field equals its value or is
empty. The label SHALL go through the host translate function and SHALL take `{days}`.

#### Scenario: A lead standing still

- **GIVEN** an open lead last changed 24 days ago and `afterDays: 14`
- **WHEN** the cell renders
- **THEN** it shows "Out of date 24 days" (translated)

#### Scenario: A won lead

- **GIVEN** `when: { status: "open" }` and a lead with status `won`
- **WHEN** the cell renders
- **THEN** no badge shows
