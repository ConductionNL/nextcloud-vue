# week-grid Delta: week-grid

## ADDED Requirements

### Requirement: A week grid draws days as columns and slots as rows

`CnWeekGrid` SHALL draw a table with one column per day of the week that holds `week` (Monday to
Friday, or all seven days with `days: 7`) and one row per entry of `rows`, the slot's label and its
`start`–`end` as the row header. An entry of `items` SHALL appear in the cell of its `date` and its
`row`, with its title, its meta (a list joined with ", ") and, when it has a `pill`, the pill's label
drawn by its variant (`changed`, `cancelled`, `substitute`, `info`; any other value as `changed`).
An entry outside the week, of a slot not in `rows`, or without a title SHALL NOT be drawn. Today's
column header SHALL carry `aria-current="date"` and the word "today". An entry with a safe `href`
SHALL be a link, any other entry a button; activating either SHALL emit `item-click` with the entry.
Without rows the grid SHALL say "Nothing planned this week" or `emptyText`.

#### Scenario: A lesson sits in its day and hour

- **GIVEN** the week of Monday 5 October 2026, rows "1st hour" and "2nd hour", and Maths on Monday in the first hour
- **WHEN** the grid renders
- **THEN** the cell of the first hour on Monday holds Maths and no other cell does
- @e2e exclude {component test: tests/components/CnWeekGrid.spec.js}

#### Scenario: A cancelled lesson says so

- **GIVEN** History on Friday with the pill "Cancelled", variant `cancelled`
- **WHEN** the grid renders
- **THEN** the entry shows the pill "Cancelled" and its title struck through
- @e2e exclude {component test: tests/components/CnWeekGrid.spec.js}

### Requirement: The week grid navigates by week

With `navigation` (the default) the grid SHALL show Previous week, This week and Next week. They
SHALL emit `week-change` with the Monday of the week before, of the week of `now`, and of the week
after the drawn week. This week SHALL be disabled while the drawn week is the current one.

#### Scenario: The next week is asked for

- **GIVEN** the grid on the week of Monday 12 October 2026
- **WHEN** the user activates Next week
- **THEN** `week-change` is emitted with Monday 19 October 2026
- @e2e exclude {component test: tests/components/CnWeekGrid.spec.js}
