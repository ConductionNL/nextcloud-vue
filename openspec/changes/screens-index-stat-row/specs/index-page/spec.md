# index-page Delta: screens-index-stat-row

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-index-stat-row](../../)

## Purpose

Let an index page draw KPI tiles above its list and cards beside it from the
manifest, as DqTeamwachtrij and PqContracten.

## ADDED Requirements

### Requirement: An index page can draw a stat row above the list

CnIndexPage SHALL read `statRow`, a list of widget definitions `{ id, type,
title?, content }` (default empty), and SHALL draw them between the header
and the toolbar in a CnKpiGrid with `columns: "auto"`, in the listed order,
each in a widget card without a title and without an Actions menu. A type
SHALL resolve through the app's widget registry, then the dashboard catalog,
then the built-in widgets; an entry without an id or with a type nothing
resolves SHALL be skipped with a development warning. Without `statRow` the
page SHALL render as before.

#### Scenario: Three tiles above the queue

- **GIVEN** `statRow` with three `stat` widgets
- **WHEN** the page renders
- **THEN** the three tiles sit in an auto-fit row above the toolbar, in the listed order

### Requirement: An index page can draw a side panel beside the list

CnIndexPage SHALL read `sidePanel`, a list of widget definitions `{ id, type,
title?, content, headerLink? }` (default empty), and SHALL draw them as an
`aside` of titled cards (title through the host translate function, the
`headerLink` in the card header, no Actions menu) in a 300px column right of
the toolbar and the list, 20px from them, 16px between cards. Below 1024px
the column SHALL sit above the toolbar. Types SHALL resolve as for the stat
row. Without `sidePanel` the page SHALL render as before.

#### Scenario: Team today beside the queue

- **GIVEN** `sidePanel` with an app widget titled "Team today" and a table widget
- **WHEN** the page renders
- **THEN** an aside right of the list holds both cards, the first titled with the translated "Team today"
