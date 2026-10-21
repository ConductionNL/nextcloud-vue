# live-refetch-keeps-list-params Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [live-refetch-keeps-list-params](../../)

## Purpose

A live refetch repeats the list's own query for as long as the store lives.

## ADDED Requirements

### Requirement: A live refetch repeats the list's last query

The live-updates plugin SHALL record the parameters of every `fetchCollection` call for the life of the store, whatever
component first created it, so a refetch on a live hint repeats the last query (page size, page, filters). The logs
plugin's auto-refresh on `setItem` SHALL likewise outlive the component that first created the store.

#### Scenario: The first user of the store unmounts

- **GIVEN** a store first created inside a component that has since unmounted
- **WHEN** a list fetches `{ _limit: 20, _page: 1 }` and a live hint arrives
- **THEN** the refetch uses `{ _limit: 20, _page: 1 }`, not an empty query

#### Scenario: DqZaken

- **GIVEN** the cases index showing 20 of 297 cases
- **WHEN** a live hint refetches the list
- **THEN** it still shows 20 rows and the pager under them
