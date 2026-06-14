manifest-index-self-fetch
---
status: draft
---
# `type:"index"` manifest pages — self-fetch, `config.filter`, `columns[].aggregate`

## Purpose

A manifest `type:"index"` page dispatches to `CnIndexPage` (`defaultPageTypes.index`).
`CnPageRenderer` mounts it spreading `pages[].config` (so it receives `register`,
`schema`, `columns`, `sidebar`, `actions`) plus `$route.params`, but **never an
`objects` prop** — and `CnIndexPage` is purely presentational (`objects` is a prop
with a `[]` default; no `useObjectStore`/`useListView`/`axios`; no fetch in any
lifecycle hook). So a manifest-declared `type:"index"` page renders an empty table.
This change closes that gap and adds the two list-page abstractions the conversion
wave needs:

1. `$defs.column.aggregate` + `CnDataTable` rendering of count-of-related-objects columns.
2. `CnIndexPage` store-backed self-fetch mode (via `useListView`), gated on
   `register`+`schema`+default-`objects` so consumer-managed pages are unaffected.
3. `pages[].config.filter` — a route-param-interpolated base filter merged into the
   self-fetch, so a list scoped to a parent (`/automations/:id/history`,
   `/forms/:id/submissions`) is a declarative `type:"index"` page.
4. `useListView` `opts.fixedFilters` — the always-merged filter map (3) rides on.

`CnLogsPage` is the reference for the self-fetch pattern; `useListView('<objectType>',
{…})` already does the list lifecycle (collection fetch + `_search`/`_order`/`_page`/
`_limit`/`activeFilters` + schema load + sidebar wiring + the `on*` handlers).

---

## ADDED Requirements

### Requirement: REQ-MISF-1 The `column` $def MUST accept an `aggregate` block

The `column` $def in `src/schemas/app-manifest.schema.json` MUST add an optional
`aggregate` object — `{ register?: string, schema: string, op: enum["count"], where: object }`
— with `additionalProperties: false`, `required: ["schema", "op"]`. `op` is the
closed enum `["count"]` for now (`sum`/`min`/`max`/`avg` widen it later, forward-
compatibly). No schema `version` bump (additive — the field is on an existing $def
that other manifests don't use). Columns without `aggregate` MUST keep validating.

#### Scenario: Aggregate column validates
- GIVEN a column `{ "key": "submitCount", "label": "Submissions", "aggregate": { "schema": "intakeSubmission", "op": "count", "where": { "intakeForm": "@self.id" } } }`
- WHEN `validateManifest()` runs
- THEN it MUST return `{ valid: true, errors: [] }`

#### Scenario: Aggregate with an unknown `op` rejects
- GIVEN a column `{ "key": "x", "label": "X", "aggregate": { "schema": "y", "op": "sum" } }`
- WHEN `validateManifest()` runs
- THEN it MUST return `{ valid: false }` with an error on the `op` enum

#### Scenario: A plain column still validates against the updated schema
- GIVEN a manifest whose `pages[].config.columns[]` use only `{ key, label }` (no `aggregate`)
- WHEN `validateManifest()` runs
- THEN it MUST return `{ valid: true, errors: [] }`

### Requirement: REQ-MISF-2 `CnDataTable` MUST render `columns[].aggregate` as a count of related objects

`CnDataTable` MUST, for every `effectiveColumns` entry whose `aggregate.op === "count"`,
after the `rows` prop changes (and on mount), issue one
`axios.get(generateUrl('/apps/openregister/api/objects/' + register + '/' + schema), { params: { ...resolvedWhere, _limit: 0 } })`
per visible row — `resolvedWhere` being `aggregate.where` with every string value of
the form `"@self.<path>"` replaced by `getCellValue(row, path)`, other values passed
through; `register` falls back to a value the embedding `CnIndexPage` injects (REQ-MISF-3.f).
Requests MUST be batched (`Promise.all`); the cell value MUST be
`response.data.total ?? response.data.results?.length ?? 0`, cached keyed by
`String(row[rowKey])` → column key. The cell MUST render `"…"` while the count is
pending and `"—"` when the request fails (the failure MUST be `console.warn`-logged
and MUST NOT blank the page). A monotonic request id MUST discard a stale batch's
results when `rows` (or columns) change mid-flight. The `#column-{key}` scoped slot
MUST still override the cell.

#### Scenario: Aggregate cell shows the count once resolved
- GIVEN `CnDataTable` with `rows: [{id:"a"},{id:"b"}]` and `columns: [{ key:"runs", aggregate:{ register:"r", schema:"s", op:"count", where:{ p:"@self.id" } } }]`
- AND the API returns `{ total: 3 }` for `?p=a&_limit=0` and `{ results: [{},{}] }` for `?p=b&_limit=0`
- WHEN it mounts and the requests resolve
- THEN the `runs` cell of row `a` MUST read `3` and of row `b` MUST read `2`
- AND before the requests resolve those cells MUST read `…`

#### Scenario: A failed aggregate request degrades one cell only
- GIVEN the API rejects the request for one row
- WHEN it settles
- THEN that one cell MUST read `—`, `console.warn` MUST have been called, and the other cells/rows MUST render normally

#### Scenario: Non-aggregate columns trigger no requests
- GIVEN `CnDataTable` with columns that have no `aggregate`
- WHEN it mounts
- THEN no `/api/objects/...` request MUST be issued and cells render `getCellValue(row, key)` as before

### Requirement: REQ-MISF-3 `CnIndexPage` MUST self-fetch its collection in the manifest path

`CnIndexPage` MUST gain a store-backed self-fetch mode, active when `register` AND
`schema` are both set AND the `objects` prop was not supplied by the caller (the
manifest path — `CnPageRenderer` passes `register`/`schema` from `config` but no
`objects`). When active:

a. It MUST derive `objectType = '${register}-${schema}'` and drive the list via
   `useListView(objectType, { objectStore: useObjectStore(), sidebarState: inject('sidebarState', null) ?? inject('objectSidebarState', null), defaultSort, defaultPageSize, debounceMs })` in `setup()` (which itself calls `registerObjectType(objectType, { register, schema })` + `fetchCollection` and provides the search/sort/page/filter handlers).
b. The page's `objects`, `loading`, `pagination`, `schema`, `sortKey`, `sortOrder`
   (and search term) MUST come from that `useListView` instance — exposed as
   `effective*` computeds the template binds to — rather than from the props.
c. The `@search` / `@sort` / `@page-changed` / `@filter-change` / `@refresh` handlers
   MUST route to `useListView`'s `onSearch` / `onSort` / `onPageChange` /
   `onFilterChange` / `refresh` (and MAY still `$emit` the event for observers).
d. The `schema` prop MUST be widened to `[Object, String]`; a string value (the
   manifest `config.schema` slug) is the slug handed to `useListView`, whose
   resolved schema object is then used for column generation.
e. When `objects` IS supplied (the existing consumer-managed path — every current
   consumer passes it), behaviour MUST be unchanged: no `useObjectStore` /
   `useListView` call, no `registerObjectType` / `fetchCollection`, `objects` and
   the other props are used as today.
f. Before passing `columns` to `CnDataTable`, `CnIndexPage` MUST default each
   `aggregate.register` (when unset) to its own `register` slug — so manifests can
   omit `aggregate.register`.
g. The hoisted-sidebar path (`publishHoistedSidebar` / `cnIndexSidebarConfig`) and the
   embedded `CnIndexSidebar` MUST keep working in self-fetch mode (the `sidebarState`
   handed to `useListView` carries the live search/columns/facets state).

#### Scenario: Manifest path self-fetches
- GIVEN `CnIndexPage` mounted with `register: "decidesk"`, `schema: "decision"` (a string slug), and NO `objects` prop, inside an ancestor that provides the object store
- WHEN it mounts
- THEN `registerObjectType('decidesk-decision', { register: 'decidesk', schema: 'decision' })` MUST be called, `fetchCollection('decidesk-decision', …)` MUST be called, and the table rows MUST be the store's collection for that type

#### Scenario: Search in self-fetch mode re-fetches
- GIVEN a self-fetching `CnIndexPage`
- WHEN the embedded sidebar emits `@search` with `"vergunning"`
- THEN `fetchCollection` MUST be called again with `_search: "vergunning"` and the rows MUST update

#### Scenario: Consumer-managed path is unchanged (regression)
- GIVEN `CnIndexPage` mounted with an `objects` prop (the existing usage)
- WHEN it mounts and the user searches/sorts/paginates
- THEN no `useObjectStore`/`useListView`/`fetchCollection` call MUST occur — the page MUST emit `@search`/`@sort`/`@page-changed`/`@filter-change`/`@refresh` and render the `objects` prop, exactly as before

### Requirement: REQ-MISF-4 `pages[].config.filter` MUST scope a `type:"index"` page's fetch

`CnIndexPage` MUST accept a `filter` prop (object, default `null`) — fed from
`pages[].config.filter` via `CnPageRenderer`'s `config` spread (no schema change
needed: the outer `config` is `additionalProperties: true`). In self-fetch mode, each
entry `[k, v]` of `filter` MUST be resolved: a string `v` of the form `"@route.<name>"`
or `":<name>"` → `$route.params[<name>]`; otherwise the literal `v`. The resolved map
MUST be applied to every fetch as a *fixed* filter — merged so the user's facet
`activeFilters` cannot override it — and MUST re-resolve when `$route.params` change.
In consumer-managed mode `filter` MUST have no effect (the consumer owns the fetch).

#### Scenario: Route-param filter scopes the list
- GIVEN a self-fetching `CnIndexPage` with `filter: { intakeForm: "@route.id" }` and `$route.params.id === "form-7"`
- WHEN it fetches its collection
- THEN the fetch params MUST include `intakeForm: "form-7"`

#### Scenario: User facet filters can't override the fixed filter
- GIVEN the page above, and the user picks a facet value for `intakeForm` in the sidebar
- WHEN the re-fetch happens
- THEN the fetch params' `intakeForm` MUST still be `"form-7"` (the fixed filter wins)

### Requirement: REQ-MISF-5 `useListView` MUST accept an always-merged `opts.fixedFilters`

`useListView(objectType, opts)` MUST accept `opts.fixedFilters` — a plain object OR a
function/ref returning one. Whenever it builds fetch params, it MUST spread
`fixedFilters` *after* `activeFilters` so the fixed entries always win. Default `{}`
— omitting `fixedFilters` MUST be behaviourally identical to today.

#### Scenario: fixedFilters always present in fetch params
- GIVEN `useListView('t', { objectStore, fixedFilters: { a: 1 } })`
- WHEN any fetch is triggered (mount, search, sort, page change)
- THEN the params passed to `fetchCollection` MUST include `a: 1`

#### Scenario: fixedFilters overrides a colliding activeFilter
- GIVEN `useListView('t', { objectStore, fixedFilters: { status: "open" } })` and the user sets the `status` facet to `"closed"`
- WHEN the re-fetch happens
- THEN the params MUST carry `status: "open"`

#### Scenario: No fixedFilters → no change
- GIVEN `useListView('t', { objectStore })` (no `fixedFilters`)
- WHEN it fetches
- THEN the params MUST match the pre-change behaviour exactly
