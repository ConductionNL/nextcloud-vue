# index-page Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [index-quick-filter-placement-per-view](../../)

## Purpose

Each view of an index page can place its quick filters as its board draws them.

## ADDED Requirements

### Requirement: The quick-filter placement can differ per view

With `quickFilterPlacementByView` an index page SHALL use the placement named for the current view mode, and
`quickFilterPlacement` in a view it does not name.

#### Scenario: dossiq's case list

- **GIVEN** `quickFilterPlacementByView: { board: "toolbar", map: "toolbar" }`
- **WHEN** the map view shows
- **THEN** the chips sit on the toolbar row beside the Filter button
- **WHEN** the table view shows
- **THEN** the chips sit as `quickFilterPlacement` places them
