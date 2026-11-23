# index-page Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [index-held-default-filters](../../)

## Purpose

A list that opens on open records keeps doing so when a link narrows it in another way.

## ADDED Requirements

### Requirement: A held default filter stays under a link's own filters

With `heldDefaultFilters` CnIndexPage SHALL add each listed `defaultFilters` key to the filters a route query names,
unless the query names that key itself. A route query that names a saved view SHALL keep the saved view's filters only.
`defaultFilters` keys that are not listed SHALL give way to the query's filters as before.

#### Scenario: DqWerkbord from a case-type link

- **GIVEN** the Cases page with `defaultFilters: { isFinalStatus: false, assignedGroup: "@myTeam" }` and `heldDefaultFilters: ["isFinalStatus"]`
- **WHEN** it opens at `?caseType=woo&assignedGroup=team-woo`
- **THEN** the list asks for open cases of that case type and team only, and no closed case shows

#### Scenario: A link that asks for closed cases

- **GIVEN** the same page
- **WHEN** it opens at `?caseType=woo&isFinalStatus=true`
- **THEN** the list asks for the closed cases of that case type
