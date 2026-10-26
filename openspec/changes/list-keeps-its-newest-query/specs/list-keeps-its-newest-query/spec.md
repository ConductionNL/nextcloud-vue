# list-keeps-its-newest-query Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [list-keeps-its-newest-query](../../)

## Purpose

What an index list shows follows the newest query it asked for, whatever order the responses arrive in.

## ADDED Requirements

### Requirement: The newest list query decides what the list shows

`fetchCollection` SHALL store a response's rows, pagination, facets and error only when no newer `fetchCollection`
for the same type started after it. An older response that arrives later SHALL be dropped.

#### Scenario: The board's fetch lands after the table's

- **GIVEN** a list fetched `{ _limit: 500 }` for its board view and the response is still in flight
- **WHEN** the person switches to the table, the list fetches `{ _limit: 20 }`, and the 20-row response arrives first
- **THEN** the list keeps the 20 rows and a pager limit of 20 after the 500-row response arrives

### Requirement: A live refetch repeats the newest query

The live-updates plugin SHALL record a `fetchCollection` call's parameters when the call starts, and SHALL NOT record
an `append` page, so a refetch on a live hint repeats the newest query the list asked for.

#### Scenario: A hint during the table's fetch

- **GIVEN** a completed `{ _limit: 500 }` fetch and a `{ _limit: 20 }` fetch still in flight
- **WHEN** a live hint refetches the list
- **THEN** the refetch uses `{ _limit: 20 }`

#### Scenario: Load more on the board

- **GIVEN** a board that fetched `{ _limit: 500, _page: 1 }` and then appended `{ _limit: 500, _page: 2 }`
- **WHEN** a live hint refetches the list
- **THEN** the refetch uses `{ _limit: 500, _page: 1 }`
