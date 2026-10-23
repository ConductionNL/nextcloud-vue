# index-sources Delta: tasks-source-sorts-on-server

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [tasks-source-sorts-on-server](../../)

## ADDED Requirements

### Requirement: A named source can sort on the server

A named source that declares `sortParam(key, order)` SHALL receive the order a sortable column header asks for as the
request parameters `sortParam` returns, starting from the page's `sortKey` and `sortOrder`, and the page SHALL fetch
again from its first page when the order changes. A column `sortParam` answers null for SHALL NOT change the request.
The tasks source SHALL sort by deadline, priority and creation this way.

#### Scenario: DqTaken

- **GIVEN** the Tasks index with `sortKey: "dueAt"`, `sortOrder: "asc"`
- **THEN** the inbox is asked with `sort=dueAt`
- **WHEN** the reader sorts the Priority column descending
- **THEN** the inbox is asked again, from page 1, with `sort=-priority`
