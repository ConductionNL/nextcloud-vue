# due-text Delta: screens-due-text

## ADDED Requirements

### Requirement: A due date reads as text with a tone

A record-list row with `due` and a `date` column with `widgetProps.due` SHALL
draw the field as text: a date before today reads "N days overdue" (or
`overdueLabel`) in the danger tone, today reads "Due today" (or `todayLabel`), a
day still to come reads the relative date ("tomorrow", then the short date), and
an empty field reads `emptyText` in the muted tone, or nothing without it. Texts
go through the host's translate; `{count}` in `overdueLabel` is the number of days.

#### Scenario: Overdue

- **GIVEN** a row whose deadline was three days ago, for a Dutch reader
- **WHEN** the row renders with `due: { field: "deadline" }`
- **THEN** it reads "3 dagen te laat" in the danger colour
- @e2e e2e/due-text.e2e.js

#### Scenario: Today and empty

- **GIVEN** one row due today and one without a deadline, with `emptyText: "Geen deadline"`
- **WHEN** the rows render
- **THEN** they read "Vandaag" and "Geen deadline"
- @e2e e2e/due-text.e2e.js

#### Scenario: A table cell

- **GIVEN** a date column with `widgetProps: { due: { emptyText: "Geen deadline" } }`
- **WHEN** a cell holds a date three days ago
- **THEN** it reads "3 dagen te laat" with the error tone, and the tooltip holds the full date
- @e2e e2e/due-text.e2e.js
