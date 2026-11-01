# list-waits-for-its-schema Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [list-waits-for-its-schema](../../)

## ADDED Requirements

### Requirement: A list fetch waits for the schema the mount is loading

`useListView` SHALL NOT fetch its collection while the mount's schema request is still in flight: a refresh started in that window waits for it, so the store knows the facetable properties and asks for facets.

#### Scenario: Default filters applied before the schema arrived

- GIVEN the case list mounts and its schema request is slow
- WHEN a watcher refreshes the list before the schema has arrived
- THEN the list request is sent after the schema arrived, with `_facets=extend`, and the side panel draws its filters with counts
