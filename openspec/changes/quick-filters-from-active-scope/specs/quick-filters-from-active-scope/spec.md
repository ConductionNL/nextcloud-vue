# quick-filters-from-active-scope Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [quick-filters-from-active-scope](../../)

## ADDED Requirements

### Requirement: Generated quick filters count within the active filters

The tabs `quickFiltersFrom` generates SHALL come from the field's values within the page filter and the active filters (a saved view's, default or the reader's), without the field's own filter, so a tab names only values the list holds.

#### Scenario: DqTeamwachtrij

- GIVEN the team queue view (unassigned, open, the reader's team) holding 3 Woo cases
- THEN the chips read "Alle typen 3" and "Woo-verzoek 3"

#### Scenario: A picked tab keeps the others

- GIVEN the "Woo-verzoek" tab is lit
- THEN the other types are still counted within the remaining filters
