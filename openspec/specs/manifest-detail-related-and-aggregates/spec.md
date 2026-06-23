# manifest-detail-related-and-aggregates Specification

## Purpose
TBD - created by archiving change manifest-detail-related-and-aggregates. Update Purpose after archive.
## Requirements
### Requirement: REQ-MDRA-1 — CnDetailPage SHALL render declarative related collections

`CnDetailPage` SHALL, when `relatedCollections` is a non-empty array, render a
`CnRelatedCollections` instance below the detail body forwarding the array;
each entry SHALL render a titled `CnObjectListWidget` whose filter is scoped to
the current object via `@objectId` / `@object.<field>` tokens. An empty /
omitted `relatedCollections` SHALL render no related section.

#### Scenario: related collections render with the configured entries
- GIVEN a `CnDetailPage` with `relatedCollections=[{ title: 'Cases', register: 'r', schema: 'case', filter: { client: '@objectId' } }]`
- WHEN the page renders
- THEN a `CnRelatedCollections` instance is mounted with those collections

#### Scenario: omitting related collections renders nothing
- GIVEN a `CnDetailPage` with no `relatedCollections`
- WHEN the page renders
- THEN no `CnRelatedCollections` instance is mounted

### Requirement: REQ-MDRA-2 — CnRelatedCollections SHALL map each entry to an object-list widget

`CnRelatedCollections` SHALL render one titled section per descriptor, mapping
`{ register, schema, filter, columns, sort, limit, rowRoute }` to a
`CnObjectListWidget` content blob (defaulting `limit` to 10), and SHALL re-emit
a `row-click` with `{ collection, row, index }`.

#### Scenario: descriptor maps to a list content blob
- GIVEN `CnRelatedCollections` with one descriptor `{ title: 'Cases', register: 'r', schema: 'case', filter: { client: '@objectId' }, rowRoute: 'cases-detail' }`
- WHEN it renders
- THEN one section titled `Cases` is rendered
- AND the contained `CnObjectListWidget` receives content `{ register: 'r', schema: 'case', filter: { client: '@objectId' }, rowRoute: 'cases-detail', limit: 10 }`

### Requirement: REQ-MDRA-3 — CnSummaryAggregates SHALL fetch object-scoped aggregates

`CnSummaryAggregates` SHALL, for each descriptor `{ label, register, schema,
metric?, field?, filter? }`, fetch one value from OpenRegister's ad-hoc
`/value` aggregation endpoint with the filter tokens resolved against the
detail-page object context (so `@objectId` scopes the aggregate), and render it
as a labelled chip. `CnDetailPage` SHALL mount it in the header when
`summaryAggregates` is non-empty.

#### Scenario: object-scoped count chip
- GIVEN `CnSummaryAggregates` with `[{ label: 'Open cases', register: 'pipelinq', schema: 'case', metric: 'count', filter: { client: '@objectId', status: 'open' } }]` and an object context `{ objectId: 'o1' }`
- WHEN it mounts
- THEN it requests the `/value` aggregation with `filter[client]=o1` and `filter[status]=open` and `metric=count`
- AND renders a chip labelled `Open cases` with the returned value

### Requirement: REQ-MDRA-4 — fetchAggregateValue SHALL accept an optional resolution context

`fetchAggregateValue` and `flattenAggFilter` SHALL accept an optional `ctx`
argument forwarded to `resolveFilterTokens`, so a caller can resolve
`@objectId` / `@object.<field>` tokens. Omitting `ctx` SHALL preserve the prior
behaviour (relative/`@me` tokens still resolve).

#### Scenario: ctx resolves @objectId in the aggregate filter
- GIVEN `fetchAggregateValue({ register: 'r', schema: 's', filter: { client: '@objectId' } }, { objectId: 'o1' })`
- WHEN it builds the request
- THEN the filter param `filter[client]` equals `o1`

### Requirement: REQ-MDRA-5 — a relation-link action SHALL patch a foreign key

`CnDetailPage` SHALL, for each `relationLinks` entry `{ label?, register,
schema, fkField, labelField?, allowCreate? }`, render a button that opens
`CnRelationLinkModal`. On confirm the modal SHALL merge `{ [fkField]:
<selectedId> }` onto the current object and save it via the object store, emit
`linked` with the saved object, and `CnDetailPage` SHALL re-fetch the object
and emit `relation-linked`.

#### Scenario: link button opens the modal with the page context
- GIVEN a `CnDetailPage` for object `o1` (type `r-s`) with `relationLinks=[{ register: 'r', schema: 'client', fkField: 'client' }]`
- WHEN the link button is clicked
- THEN `CnRelationLinkModal` is mounted with `register='r'`, `schema='client'`, `fkField='client'`, `currentType='r-s'`, and the current object

#### Scenario: confirming patches the FK and reloads
- GIVEN an open `CnRelationLinkModal` with a selected object id `client-99` and current object `{ id: 'obj-1', name: 'Jane' }`
- WHEN the link is confirmed
- THEN the store saves `{ id: 'obj-1', name: 'Jane', client: 'client-99' }`
- AND `linked` is emitted with the saved object
- AND the hosting `CnDetailPage` re-fetches the object and emits `relation-linked`

