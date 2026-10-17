# index-page Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [index-quick-filters-from](../../)

## Purpose

A list can offer a quick filter per value its data actually holds.

## ADDED Requirements

### Requirement: Quick filters can come from a field's values

With `quickFiltersFrom` and no `quickFilters`, CnIndexPage SHALL draw an "All" tab and one tab per distinct value of the
field within the page filter, ordered by count, each with its count; a tab filters the list on its value. With `register`
and `schema` each tab SHALL show the referenced record's label. A failed request SHALL draw no tabs.

#### Scenario: The team queue

- **GIVEN** a queue with 4 Woo requests, 3 permits and 2 objections and
  `quickFiltersFrom: { field: "caseType", register: "dossiq", schema: "caseType", labelField: "title", allLabel: "Alle typen" }`
- **THEN** the tabs read "Alle typen 9", "Woo-verzoek 4", "Omgevingsvergunning 3", "Bezwaar 2"
