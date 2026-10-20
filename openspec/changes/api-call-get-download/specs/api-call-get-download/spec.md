# api-call-get-download Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [api-call-get-download](../../)

## Purpose

A header action can download a file an app endpoint answers on GET, with the page's workspace values as its query.

## ADDED Requirements

### Requirement: An api-call can GET a download

An `api-call` action with `method: "GET"` SHALL send its token-resolved `params` as the query string, leaving out an
unresolved optional token. With `download: true` it SHALL download the answer as a file, named by the response's
Content-Disposition, else by `filename`.

#### Scenario: DqDoorlooptijd Downloaden

- **GIVEN** a dashboard header action `{ type: "api-call", method: "GET", url: "/apps/dossiq/api/doorlooptijd/metrics", params: { format: "csv", period: "@workspace.datePreset", caseType: "@workspace.caseType?" }, download: true }`
- **WHEN** no case type is chosen and the period is "3m"
- **THEN** the page GETs `.../metrics?format=csv&period=3m` and downloads `doorlooptijd.csv`
