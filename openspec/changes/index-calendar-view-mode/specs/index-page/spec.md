# index-page Delta: index-calendar-view-mode

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [index-calendar-view-mode](../../)

## Purpose

`CnIndexPage` shows its filtered records on a month calendar by a date
field. Row `pg-calendar` (buildiq matrix).

## ADDED Requirements

### Requirement: The index page offers a calendar view mode

`CnIndexPage` SHALL accept `calendar` as a `viewMode` value, offered only
when `config.viewModes` lists it, and SHALL render the current filtered
rows with `CnObjectCalendar` using `config.calendar.dateField`, the
optional `endDateField` and the optional `titleField`. A click on an
entry SHALL open the record as a row click does. A page that does not
list `calendar` SHALL behave exactly as before.

#### Scenario: An inspector sees the month's inspections

- GIVEN an Inspections page with `viewModes: ["table", "calendar"]` and `calendar.dateField: "inspectionDate"`
- WHEN the inspector switches to Calendar
- THEN this month's inspections appear on their dates
- AND clicking "Kerkstraat 12" opens that inspection

#### Scenario: An entry spans its days

- GIVEN `endDateField: "inspectionEnd"` and an inspection from the 3rd to the 5th
- WHEN the month renders
- THEN the entry shows on the 3rd, 4th and 5th

### Requirement: The calendar fetches only the visible month

In calendar mode the page SHALL add a range condition for the visible
month on the date field (and the end field when set) to the list query it
already sends, SHALL send it again when the month changes, and SHALL
remove it when leaving calendar mode. On a page showing a saved view it
SHALL use OpenRegister's `/api/views/{id}/calendar` with the month's
start and end.

#### Scenario: Next month asks for next month

- GIVEN the calendar shows September
- WHEN the user moves to October
- THEN the list request carries a range from 1 to 31 October on the date field
- AND the September entries are no longer shown

#### Scenario: The table is not narrowed after leaving

- GIVEN the user switched from Calendar back to Table
- WHEN the table loads
- THEN no month range is in the request

### Requirement: The calendar is reachable from the keyboard

Every day cell SHALL be focusable and movable with the arrow keys, every
entry SHALL be a button, and a "+N more" count SHALL be a button that
shows that day's records in the table view.

#### Scenario: A busy day opens as a list

- GIVEN a day with 9 inspections and `maxEventsPerDay` 3
- WHEN the user activates "+6"
- THEN the page shows the table filtered to that day with all 9
