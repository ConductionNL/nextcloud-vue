# Proposal: description-today-week

## Why

DqTermijnen's description opens with the week: "Week 41 · alle teams". A dashboard description has no way to name
today's week; it is the one reading of today the boards use that the templates lack.

## What changes

A template may format a date as its ISO week, `{path|week}` ("Week 41"). A dashboard description may format today
through any template format, `{today|<format>}` ("{today|week} · all teams", "{today|longdate}").

## Scope

`utils/boardDate.js` (`isoWeek`), `utils/fillTemplate.js` (`week`), CnDashboardPage's description, the library
catalogue ("Week {week}"). No schema change.
