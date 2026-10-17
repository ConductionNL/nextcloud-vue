# Proposal: working-calendar-widget

## Why

Board DqInstellingenAlgemeen shows "Werkdagen en feestdagen": a month of the working calendar with the weekend grey, the
holidays and closures red, and "Dag toevoegen". The calendar is an OpenRegister object (`flow-timers` /
`working-calendar`) that the business timers compute deadlines with, and OpenRegister already expands its rules into
dates through `/api/flow-timers/calendars/preview`. No library widget drew it.

## What changes

- New widget type `working-calendar` (CnWorkingCalendarWidget): a Monday-first month grid over a calendar object read by
  id or filter, with the closed dates from OpenRegister's preview for the year shown.
- Add day appends `{ date, name }` to `exceptions` with one update through the object API, under the reader's rights;
  it shows for administrators, as OpenRegister lets only administrators update a calendar.
- A keyboard grid with one tab stop and every day labelled; Dutch strings.
- No manifest schema change.
