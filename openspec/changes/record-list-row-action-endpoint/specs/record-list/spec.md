# record-list Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [record-list-row-action-endpoint](../../)

## ADDED Requirements

### Requirement: A row's one action can call an app endpoint for that row

A `rowAction` with `endpoint` SHALL be drawn as a button and, when pressed, SHALL request that app URL with `method`
(default POST), the page's `@objectId` and the row's `{field}` tokens filled in, then read the list again. A refused
request SHALL show the server's sentence, else `errorText`. A row whose `labels` map gives an empty label SHALL have no
action.

#### Scenario: DqZaakBesluiten Adviezen

- **GIVEN** advice requests, one open and one received, and `rowAction: { label: "Remind", endpoint: "/apps/dossiq/api/advice/{id}/remind", labels: { field: "status", map: { received: "" } } }`
- **WHEN** the handler presses "Herinneren" on the open request
- **THEN** a POST goes to that request's remind URL and the list reads again; the received request has no button
