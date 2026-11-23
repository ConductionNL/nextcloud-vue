# index-page Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [index-counts-read-the-list-endpoint](../../)

## ADDED Requirements

### Requirement: An index page's counts come from the list request

An index page SHALL count its quick-filter tabs, saved views and filter-strip pills with the same list request the list
sends (the list endpoint's total), never an aggregation endpoint, so a chip's number equals the list's total for that
chip.

#### Scenario: DqZaken

- GIVEN the Cases list on its All lens
- THEN the "Alles" chip reads the same number as the list's total
