# index-page Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [generated-quick-filters-count-as-the-list](../../)

## ADDED Requirements

### Requirement: Generated quick filters count as the list

Quick-filter tabs made from a field's values (`quickFiltersFrom`) SHALL be counted as declared tabs are: within the
active filters, with the list's own request. The grouped count MAY show until that count arrives.

#### Scenario: DqTeamwachtrij

- GIVEN the team queue of the reader's team with 3 unassigned cases, all Woo-verzoek
- THEN "Alle typen" reads 3 and "Woo-verzoek" 3
