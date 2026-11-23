# data-table Delta: screens-date-tile-cell

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-date-tile-cell](../../)

## Purpose

A meeting's date reads at a glance: the day in a tile, the weekday and the hours beside it.

## ADDED Requirements

### Requirement: A date cell can be a date tile with a time range

A `date` cell with `widgetProps.layout: "block"` SHALL draw a 46px tile holding the day number over the short month
(without a trailing dot), and beside it the weekday and the time of day. When `widgetProps.endField` names a row
field with a date, the time SHALL be the range from the start to that time ("09.30 tot 12.00 uur" in Dutch). A date
without a time of day SHALL draw no time line. A `date` cell without the layout SHALL render as before.

#### Scenario: Meeting date and time

- **GIVEN** a column `{ key: "scheduledDate", widget: "date", widgetProps: { layout: "block", endField: "endDate" } }`
- **AND** a row with `scheduledDate` 2026-10-06 09:30 and `endDate` 2026-10-06 12:00, read in Dutch
- **WHEN** the table renders
- **THEN** the cell shows a tile "6" over "okt", and beside it "dinsdag" over "09.30 tot 12.00 uur"
