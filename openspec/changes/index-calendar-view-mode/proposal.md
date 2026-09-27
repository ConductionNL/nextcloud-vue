---
kind: code
depends_on: []
---

# Proposal: index-calendar-view-mode

## Why

An index page shows its records as a table, cards, a list, a map, a board
or a date axis. It cannot show them on a month calendar by their date
field, which is how people read appointments, deadlines, inspections and
events. The library already has the calendar: `CnObjectCalendar` plots
objects on a month by a date property and emits the range it needs. No
page can reach it. It is exported and mounted nowhere.

## Row

| matrix | row | name | own rating | built |
|---|---|---|---|---|
| buildiq | `pg-calendar` | Show records on a calendar by their date field. | no | none |

The buildiq reader looked for a page type and found none; the note flags
the dashboard `CnCalendarWidget` as a possible partial and not a records
calendar. Read for this change: `CnObjectCalendar`
(`src/components/CnObjectCalendar/`, added in #530) is the records
calendar, and nothing mounts it.

## Competitor evidence, quoted from the buildiq matrix

- NocoBase, yes: "packages/plugins/@nocobase/plugin-calendar/src/client-v2/models/CalendarBlockModel.tsx:1262
  calendar block placing records by their date fields",
  https://github.com/nocobase/nocobase (v2.2.18)
- Budibase, yes: "packages/client/manifest.json:10035 Calendar with data
  provider, event start, event end and title fields",
  https://github.com/Budibase/budibase (v3.46.0)
- Mendix, yes: "the platform-supported Calendar module displays and
  manages calendar events",
  https://docs.mendix.com/appstore/modules/calendar-module/
- Appsmith and Power Apps, partial: a custom component has to be written.

Three competitors rated yes. No demand row.

## What changes

- `calendar` becomes a view mode of `CnIndexPage`, opted in through
  `config.viewModes` like `board` and `dateAxis`, configured with
  `config.calendar: { dateField, endDateField?, titleField? }`.
- The calendar shows the page's current filtered rows for the visible
  month. Moving to another month narrows the list query to that month's
  range, so the calendar never fetches the whole schema.
- A click on an entry opens the record, as a table row does.

## Affected projects

- `nextcloud-vue`: `CnIndexPage`, `CnActionsBar` (the toggle), the manifest
  v2 schema, `CnObjectCalendar` (a keyboard pass).
- Consumers: buildiq built apps, dossiq (deadlines), larpinq (events),
  planninq, pipelinq (appointments).

## Backward compatibility

`viewMode` gains one value and keeps its default. A page that does not
list `calendar` in `config.viewModes` is unchanged.

## Out of scope

- Dragging an entry to another day to reschedule it. The date axis made
  the same call for the same reason: a view that changes dates from a
  picture changes them without the form's validation.
- Week and day grids. The month is what `CnObjectCalendar` renders and
  what the competitors' first view is.
