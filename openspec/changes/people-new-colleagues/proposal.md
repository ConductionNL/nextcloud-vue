# Proposal: people-new-colleagues

## Why

Board LpIntranet draws a people widget "Nieuwe collega's": who started recently or starts soon, with photo, role and
team, and "begint maandag" for someone who has not started yet. LaunchPad keeps the start date in a custom profile
field and answers `GET /api/people/new` (launchpad change people-new-colleagues); CnPeopleWidget and its form have no
such selection.

## What changes

- CnPeopleWidgetForm: a Selection choice "People by filter" / "New colleagues", the second offered only when the
  injected `cnPeopleSource.hasStartDateField()` resolves true (or the placement already uses it); with it two windows,
  `newSinceDays` (1–90, default 30) and `newUntilDays` (0–30, default 14), validated.
- CnPeopleWidget: with `selectionMode: 'new'` and a source exposing `fetchNewPeople({ since, until, filters,
  excludeDisabled })`, the list comes from it (`{ configured, users: [{ id, displayName, role, organisation, avatarUrl,
  startDate, starts }] }`), "Starts {weekday}" marks a future start, and `configured: false` reads "The administrator
  has not set a start date field." A source without `fetchNewPeople` keeps the directory.

## Impact

`CnPeopleWidget.vue`, `CnPeopleWidgetForm.vue`, en + nl strings, `tests/components/CnPeopleWidgetNewColleagues.spec.js`.
