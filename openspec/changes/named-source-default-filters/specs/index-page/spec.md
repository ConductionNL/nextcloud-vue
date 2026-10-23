# index-page Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [named-source-default-filters](../../)

## Purpose

A list over a named source can open narrowed, as a register list can.

## ADDED Requirements

### Requirement: A named-source page can open with removable default filters

An index page over a named source SHALL start its sidebar filters from `defaultFilters` when the route query names no
declared filter and no saved view, with `@`-tokens resolved; a range filter is `{ from, to }`. The filters SHALL be sent
to the source and removed with their chip or "Clear all" like any other. A route query that names a filter or a saved
view SHALL win over the defaults.

#### Scenario: DqTaken

- **GIVEN** the Tasks page with `defaultFilters: { dueAt: { from: "@monthStart", to: "@monthEnd" } }`
- **WHEN** it opens at `/tasks` in October
- **THEN** the list shows the tasks due from 1 to 31 October and the Active line reads "Deadline: 1 tot en met 31 oktober"
