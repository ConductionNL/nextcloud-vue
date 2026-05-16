# Make `type:"index"` manifest pages self-sufficient: store-backed self-fetch + `config.filter` + `columns[].aggregate`

## Why

A manifest `type:"index"` page maps to `CnIndexPage` (`defaultPageTypes.index`).
`CnPageRenderer` mounts that component spreading `pages[].config` (so it gets
`register`, `schema`, `columns`, `sidebar`, `actions`, …) plus `$route.params`
— but **never an `objects` prop**. And `CnIndexPage` is purely presentational:
no `useObjectStore`, no `useListView`, no `axios`, no fetch in `created()` /
`mounted()` / any watcher — `objects` is just a prop with a `[]` default. So
**a manifest-declared `type:"index"` page currently renders an empty table**
unless a consumer wires a fetching wrapper around it (none do; the fleet apps
pass `pageTypes: { ...defaultPageTypes }` unchanged). Every `type:"index"` page
across decidesk / pipelinq / procest / softwarecatalog / larpingapp is in this
state. `CnLogsPage` already proves the self-fetch pattern works for a
manifest page (`register`+`schema` → `useObjectStore` → `registerObjectType` →
`fetchCollection`), and `useListView('<objectType>', {…})` is the composable
that does the whole list lifecycle (collection fetch + schema load + sidebar
wiring + search/sort/page/filter handlers); `CnIndexPage` already has a
`setup()`. So this is the missing piece that makes the `type:"index"` manifest
pattern actually functional — and the prerequisite for the two list-page
abstractions the conversion wave still needs:

- **`pages[].config.filter`** — a base / route-param-interpolated filter merged
  into the page's fetch, so a list scoped to a parent (e.g.
  `/automations/:id/history` → `automationLog` where `automation = :id`,
  `/forms/:id/submissions` → `intakeSubmission` where `intakeForm = :id`) can be
  a declarative `type:"index"` page instead of a bespoke view.
- **`columns[].aggregate`** — a per-row count of related objects
  (`{register?, schema, op:"count", where:{rel:"@self.id"}}`), so columns like
  Queues' "items"/"agents", Forms' "submissions", etc. are declarative — the
  last lever for shrinking the remaining `type:"custom"` list pages.

## What changes

- **`CnIndexPage` — self-fetch mode.** New props: `register` already exists;
  add nothing new there. When `register` *and* `schema` are set **and the
  `objects` prop is left at its default** (the manifest path), `setup()` builds
  `objectType = '${register}-${schema}'`, calls `useListView(objectType, {
  objectStore: useObjectStore(), sidebarState: inject('sidebarState', null) ??
  inject('objectSidebarState', null), defaultSort, debounceMs })`, and the
  template binds the page's `objects` / `loading` / `pagination` / `schema` /
  `sortKey` / `sortOrder` and the `@search` / `@sort` / `@page-changed` /
  `@filter-change` / `@refresh` handlers to that composable's reactive state
  and handlers. When `objects` *is* passed (the existing consumer-managed path,
  e.g. a custom view that already calls `useListView` and binds it), behaviour
  is unchanged — the props win. `useListView` already does
  `registerObjectType(objectType, { register, schema })` + `fetchCollection`
  with `_search` / `_order` / `_page` / `_limit` / `activeFilters`, and the
  sidebar wiring (search box, columns, facets), so `CnIndexPage` just consumes it.
- **`pages[].config.filter` → `CnIndexPage.filter` prop.** New prop
  `filter: { type: Object, default: null }`. Values starting with `@route.`
  (e.g. `"@route.id"`) or `:` (`":id"`) are interpolated from `$route.params`;
  everything else is a literal. Merged into the self-fetch params as a fixed
  filter on top of the user's facet `activeFilters` (so the user can't
  un-set it). No effect in consumer-managed mode (the consumer owns the fetch).
- **`columns[].aggregate` → CnDataTable.** When `effectiveColumns[i].aggregate`
  is set, after the page's `rows` change, `CnDataTable` issues one
  `axios.get(generateUrl('/apps/openregister/api/objects/{aggRegister}/{aggSchema}'),
  { params: { ...interpolatedWhere, _limit: 0 } })` **per row** (batched with
  `Promise.all`), interpolating `@self.<path>` in `where` from the row, reads
  `data.total ?? data.results?.length ?? 0`, and caches it keyed by
  `row[rowKey]` + `col.key`. The cell renders the cached value, or `'…'` while
  pending. `aggRegister` defaults to `where`-column-less... no — `aggregate.register`
  defaults to nothing usable from CnDataTable, so the column def carries it
  explicitly: `aggregate: { register, schema, op, where }` (CnIndexPage's
  self-fetch mode fills in `aggregate.register ??= this.register` before
  passing `columns` down, so manifests can omit it). `op` is `"count"` only in
  this change (`sum`/`min`/`max`/`avg` are a deliberate follow-up — the enum is
  kept closed so it can be widened safely).
- **Schema** — `$defs.column` gains `aggregate` (`{register?:string, schema:string,
  op:enum["count"], where:object}`, `additionalProperties:false`); the `index`
  / `logs` page `config` gains `filter` (`{type:"object", additionalProperties:true}`).
  `validateManifest` already validates `$defs.column` and the per-type config
  shapes; the additions ride along (no schema `version` bump — additive).
- **Docs** — `migrating-to-manifest.md`: a paragraph noting `type:"index"` pages
  self-fetch from `register`+`schema` (and that passing `objects` opts into the
  consumer-managed path); a "Filtered index pages" section (`config.filter` with
  `@route.X`); an "Aggregate columns" section. `cn-index-page.md` /
  `docs/components/cn-index-page.md`: the self-fetch behaviour + the `filter`
  prop. `cn-data-table.md` / `docs/components/cn-data-table.md`: `columns[].aggregate`.
- **Tests** — `CnIndexPage.spec.js`: self-fetch mode mounts `useObjectStore`-backed,
  `register`+`schema` and no `objects` ⇒ `registerObjectType` + `fetchCollection`
  called, rows render from the store; passing `objects` keeps the prop-managed
  path (no store calls); `filter` with `"@route.id"` ⇒ the fetch params include
  the interpolated filter. `CnDataTable.spec.js`: a column with
  `aggregate:{register,schema,op:"count",where:{x:"@self.id"}}` ⇒ axios mocked,
  the cell shows the returned `total`; `'…'` while pending; per-row interpolation
  of `@self.<path>`.

## Affected Projects

- [x] Project: nextcloud-vue — `CnIndexPage`, `CnDataTable`, `app-manifest.schema.json`, docs, tests
- [ ] No consumer-app changes in this change. Once merged + released, the
  already-converted `type:"index"` pages (decidesk's 13, pipelinq's
  Clients/Requests/Forms/Automations/…, procest's Cases/Voorstellen/…,
  larpingapp's 9) start rendering data; a follow-up wave converts the remaining
  filtered-list / aggregate-column custom pages (pipelinq Queues / AutomationHistory,
  openbuilt Exports, …).

## Scope

### In scope
- `CnIndexPage` store-backed self-fetch mode (via `useListView`), gated on
  `register`+`schema`+default-`objects`.
- `pages[].config.filter` (route-param-interpolated base filter) → `CnIndexPage.filter` prop.
- `columns[].aggregate` (`op:"count"`, per-row, batched) → CnDataTable + the
  CnIndexPage `aggregate.register` defaulting.
- Schema `$defs.column.aggregate` + `index`/`logs` config `filter`; docs; tests.

### Out of scope
- `aggregate.op` values other than `"count"` (`sum`/`min`/`max`/`avg`) — follow-up.
- Server-side batched aggregation (one request returning per-parent counts via
  `_facets`) — the per-row `_limit=0` approach is the v1; optimising to a single
  faceted request is a follow-up (the column-config contract is forward-compatible).
- Dashboard-widget aggregate counts (`type:"dashboard"` widgets) — separate concern.
- Migrating consumer apps' remaining custom list pages — follow-up wave.

## Risks

### Risk 1: self-fetch mode regresses an existing consumer-managed `CnIndexPage`

**Severity**: Medium
**Mitigation**: Self-fetch only activates when **both** `register` and `schema`
are set **and** `objects` is at its `[]` default. Every existing consumer that
manages its own list passes `objects` (and usually `loading`/`pagination`/etc.)
— so for them nothing changes. The gate is covered by a regression test
(`objects` passed ⇒ zero store calls, rows come from the prop).

### Risk 2: aggregate columns issue too many requests

**Severity**: Low
**Mitigation**: One `_limit=0` count request per visible row (≤ the page size,
typically 20–50), batched via `Promise.all`, only for columns that declare
`aggregate`. The cell shows `'…'` until resolved; failures degrade that one cell
to `'—'` (logged), never the page. Documented; the server-side faceted-batch
optimisation is a noted follow-up.

### Risk 3: the `objectStore` used by self-fetch differs from the consumer's `createObjectStore('<app>-objects')` instance

**Severity**: Low
**Mitigation**: Self-fetch uses the library default `useObjectStore()` and
registers `'${register}-${schema}'` on it itself (mirrors `CnLogsPage`) — it
needs only the `register`/`schema` slugs, which are right there in `config`. The
fetched collection isn't shared with the consumer's custom store, but an index
page doesn't need it to be. (A future `objectStore` prop on `CnAppRoot` →
`provide('cnObjectStore')` could unify them; out of scope.)

## Rollback

Revert the commit — `CnIndexPage` goes back to prop-only (the manifest
`type:"index"` pages go back to rendering empty, the pre-change state), `filter`
/ `aggregate` go back to declared-but-inert in the schema and unread.
