# saved-view-counts-read-the-query Delta

**Status**: proposed
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: A saved view counts what its own conditions match

A saved view's count and lens filter SHALL be its `filters`, else its query's `overrides.lockedFilters` and `filters`
together.

#### Scenario: DqFilterBeheren

- **GIVEN** "Wacht op inwoner" keeps `waitingOnApplicant: true` in its query and the list's conditions as locked filters
- **THEN** its count is the cases waiting on the applicant, not the whole list
