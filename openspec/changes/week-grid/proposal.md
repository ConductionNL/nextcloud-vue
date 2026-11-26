---
kind: code
---

# Proposal: week-grid

## Summary

Two learniq boards draw a week as day columns with lesson hours as rows:
[vaartveld/LqBord](https://identity.conduction.nl/screens/board?id=vaartveld/LqBord), the teacher's
"Weekrooster", and [warmtepompacademie/LqVandaag](https://identity.conduction.nl/screens/board?id=warmtepompacademie/LqVandaag).
The analysis of both says "Er is geen bouwsteen voor een week in dagkolommen." `CnWeekStripWidget`
lists a day's items under it but has no rows. learniq's `week-timetable-grid` asks this library for
the component (its task T1).

## What changes

`CnWeekGrid`: a table with the days of one week as columns and the given time slots as rows. Each
entry sits in its day and slot, with a title, a meta line and a pill for a change (`changed`,
`cancelled`, `substitute`, `info`). Today is marked. Previous week, This week and Next week emit
`week-change` with the Monday asked for. The grid fetches nothing; the host passes the week's slots
and entries. An `item` slot replaces one entry.

Not in this change: a dashboard widget registration (the grid needs its slots and entries from the
host page), editing in the grid, a month view.
