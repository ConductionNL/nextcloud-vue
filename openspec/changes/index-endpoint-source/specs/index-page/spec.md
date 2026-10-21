# index-page Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [index-endpoint-source](../../)

## Purpose

An index page can list rows an app serves itself, from configuration.

## ADDED Requirements

### Requirement: An index page can list rows from an app endpoint

With `entitySource: "endpoint"`, CnIndexPage SHALL fetch `sourceConfig.url` (an app path) with the reader's session and
list the rows at `sourceConfig.rowsPath` (default `results`, or the body when it is an array). The other `sourceConfig`
keys and the active quick filter's filter SHALL be sent as query parameters. A failed request SHALL leave no rows.
Without an explicit `sourceConfig.url`, including when the page config arrives in its place, the page SHALL make no
request and SHALL log one console error naming the page.

#### Scenario: The postvak

- **GIVEN** `entitySource: "endpoint"`, `sourceConfig: { url: "/apps/dossiq/api/postvak" }` and a quick filter
  `{ label: "Geen zaak", filter: { match: "none" } }`
- **WHEN** the reader picks "Geen zaak"
- **THEN** the page fetches `/apps/dossiq/api/postvak?match=none` and lists its `results`

#### Scenario: No sourceConfig

- **GIVEN** an endpoint page that sets no `sourceConfig`, so the renderer hands over the page config
- **THEN** no request is made, the list is empty and the console names the page and the missing url
