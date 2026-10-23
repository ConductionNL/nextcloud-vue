# index-page Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [index-default-filters](../../)

## Purpose

A list can open narrowed and still let the person widen it.

## ADDED Requirements

### Requirement: An index page can open with removable default filters

With `defaultFilters` CnIndexPage SHALL start its active filters from them when the route query names no filter and no
saved view. They SHALL be fetched and shown on the Active line like any active filter, and removing their chip or
"Clear all" SHALL remove them. A route query that names a filter or a saved view SHALL win over the defaults.

#### Scenario: DqContracten

- **GIVEN** the Contracts page with `defaultFilters: { status: ["active", "ending", "renewal-decision", "termination-decision"] }`
- **WHEN** it opens at `/procurement/contracts`
- **THEN** the list shows the running contracts and the Active line has one Status chip
- **WHEN** the person clicks "Alles wissen"
- **THEN** every contract shows
