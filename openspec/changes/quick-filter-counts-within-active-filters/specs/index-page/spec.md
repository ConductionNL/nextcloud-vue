# index-page Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [quick-filter-counts-within-active-filters](../../)

## ADDED Requirements

### Requirement: A quick filter counts within the active filters

A quick-filter tab's count SHALL count the records the list would show with that tab chosen: the page's filter, the
active filters and the tab's own filter (which wins on its field). A saved view's count SHALL stay its own query.

#### Scenario: DqTeamwachtrij

- GIVEN the team queue filtered on team Woo en informatie with 11 unassigned cases
- THEN "Alle typen" reads 11 and each type tab counts that team's cases of its type
