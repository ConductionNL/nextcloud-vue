# CnTimelineView — date-grouped session timeline

## Why

The scholiq triage flagged `CohortTimetable` as a custom because no lib widget renders a date-grouped session list (calendar-list view). The shape recurs for "user's day", "activity feed", "course timetable".

## What

`src/components/CnTimelineView/CnTimelineView.vue` (~300 LOC). Date-grouped event list with sticky group label per day, time-range + title + optional location/description per event. Click-emits the event. Custom `groupBy` function support. Sort `asc`/`desc`. `kind` field maps to BEM modifiers for colour-coding.

## Non-goals

- Calendar grid (month/week). Tracked separately under `nextcloud-vue#284` as a follow-up `CnCalendarGrid`.
- Recurring-event expansion — consumer pre-expands.
- Drag-to-create / drag-to-reschedule — consumer-side.

## References

- [nextcloud-vue#284](https://codeberg.org/Conduction/nextcloud-vue/issues/284).
- scholiq `CohortTimetable`.
