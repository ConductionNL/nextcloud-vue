# features-board-filter-label Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [features-board-filter-label](../../)

## ADDED Requirements

### Requirement: The status filter can be named

The features board's status filter group SHALL take its accessible name from `filterLabel`, through the host translate,
and SHALL read "Status" without it. The features-and-roadmap page SHALL pass `board.filterLabel` on.

#### Scenario: DqFunctionaliteiten

- **GIVEN** `board.filterLabel: "Show"` and a Dutch catalogue mapping it to "Toon"
- **THEN** the filter group is named "Toon"
