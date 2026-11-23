# object-list Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [object-list-row-tokens](../../)

## Purpose

A row action can name the row it runs on.

## ADDED Requirements

### Requirement: A row action can read its row

A CnObjectListWidget row action SHALL fill `@row.<field>` and `{field}` from the row in its `target`, `url`, `payload`,
`params`, `props`, `query` and `filename`, and SHALL leave `{objectId}` and the page's `@`-tokens to the page context. A
`navigate` row action whose target holds a row token SHALL render as a link per row. A row value filled into a `target` or `url` SHALL be
URL-encoded. A `navigate` row action with `route` and `query` SHALL render as a router location per row, its query's row
tokens filled from the row.

#### Scenario: DqZaakGerelateerd

- **GIVEN** an object list with the row action `{ "type": "navigate", "target": "/cases?object=@row.id" }`
- **THEN** each object row's "Alle zaken op dit object" links to the cases of that object

#### Scenario: Route and query with an object URL

- **GIVEN** the row action `{ "type": "navigate", "route": "Cases", "query": { "_related[caseObject][case][objectUrl]": "{objectUrl}" } }`
- **AND** a row whose `objectUrl` holds `?` and `&`
- **THEN** the row links to `Cases` with that object URL as one query value
