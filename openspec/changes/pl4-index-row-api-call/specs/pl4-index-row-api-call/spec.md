# pl4-index-row-api-call Delta: pl4-index-row-api-call

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [pl4-index-row-api-call](../../)

## Purpose

A list row can call an app endpoint from its menu.

## ADDED Requirements

### Requirement: An index row action can call an endpoint

An index page row action of `type: "api-call"` SHALL call its `url` for the row it was picked on, with `{objectId}`
filled from the row key and `{field}` from the row, and SHALL toast the outcome. After a success the list SHALL be
read again unless `refresh` is `false`. Nothing SHALL be sent while the menu is drawn.

#### Scenario: Retry a failed export run

- **GIVEN** a row action `{ type: "api-call", url: "/apps/pipelinq/api/export/runs/{objectId}/retry", visibleWhen: { field: "status", value: "failed" } }`
- **WHEN** the user picks Retry on a failed run
- **THEN** the run's retry endpoint is called, a toast says so, and the list shows the new run
