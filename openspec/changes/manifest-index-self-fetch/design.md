# Design — `type:"index"` manifest pages: self-fetch + `config.filter` + `columns[].aggregate`

## Current state (the gap this closes)

`pageTypes.index === CnIndexPage`. `CnPageRenderer.resolvedProps = { ...page.config, ...$route.params }` — so `CnIndexPage` receives `register`, `schema`, `columns`, `sidebar`, `actions` from `config` and route params, **never `objects`**. `CnIndexPage` has no `useObjectStore`/`useListView`/`axios`, no fetch in `created()`/`mounted()`/watchers — `objects` is a prop (`default () => []`). ⇒ a manifest `type:"index"` page renders an empty table today.

Reference for the fix: `CnLogsPage` (`type:"logs"`) — `register`+`schema` ⇒ `objectStore = this.store || useObjectStore()`, `objectStore.registerObjectType('${register}-${schema}', { register, schema })`, `objectStore.fetchCollection(objectType)`; `objects = objectStore.collections[objectType]`. And `useListView('<objectType>', { objectStore, sidebarState, defaultSort, defaultPageSize, debounceMs })` already does the *whole* list lifecycle — collection fetch with `_search`/`_order`/`_page`/`_limit`/`activeFilters`, schema load, sidebar wiring, and the `onSearch`/`onSort`/`onFilterChange`/`onPageChange`/`refresh` handlers — returning `{ schema, objects, loading, pagination, searchTerm, sortKey, sortOrder, activeFilters, visibleColumns, pageSize, onSearch, onSort, onFilterChange, onPageChange, refresh }`. `CnIndexPage` already has a `setup()`.

## A) `CnIndexPage` self-fetch mode

**Activation gate** (in `setup()` / a computed): `selfFetch = !!(register && schema) && objects-prop-was-not-supplied`. (Detect "not supplied": Vue gives the prop its default `[]` — distinguish "consumer passed `[]`" from "default `[]`" via `this.$options.propsData.objects === undefined`, or simpler: gate on `register && schema && !objectsPropProvided` where `objectsPropProvided` is `'objects' in this.$options.propsData`. Use that.) When `selfFetch`:

- `setup()` calls
  ```js
  const objectType = `${props.register}-${props.schema}`
  const sidebarState = inject('sidebarState', null) ?? inject('objectSidebarState', null)
  const list = useListView(objectType, {
    objectStore: useObjectStore(),
    sidebarState,
    defaultSort: props.defaultSort || undefined,
    defaultPageSize: props.pageSize || undefined,
    debounceMs: props.searchDebounceMs || undefined,
  })
  ```
  Note: `useListView`'s `registerObjectType(objectType, { register, schema })` needs the *slugs* — `props.register` (a string slug like `"decidesk"`) and `props.schema` here is the **schema slug** too, but `CnIndexPage.schema` prop is currently typed `Object` (a resolved schema object). For the manifest path `config.schema` is a *string slug*. So: `CnIndexPage` must accept `schema` as `[Object, String]`; when it's a string and `selfFetch`, pass it as the slug to `useListView` and use `list.schema` (the resolved object `useListView` loads) for the table's column generation. When it's an object (consumer-managed path), use it directly. (This is the one prop-shape widening — backwards-compatible: `[Object, String]` still accepts `Object`.)
- The template binds to `selfFetch ? list.objects.value : props.objects`, `selfFetch ? list.loading.value : props.loading`, `selfFetch ? list.pagination.value : props.pagination`, `selfFetch ? list.schema.value : props.schema`, `selfFetch ? list.sortKey.value : props.sortKey`, etc. — implemented as computeds (`effectiveObjects`, `effectiveLoading`, `effectivePagination`, `effectiveSchema`, `effectiveSortKey`, `effectiveSortOrder`, `effectiveColumns` already exists). And the `@search`/`@sort`/`@page-changed`/`@filter-change`/`@refresh` handlers: in `selfFetch` mode, call `list.onSearch` / `list.onSort` / `list.onPageChange` / `list.onFilterChange` / `list.refresh` (AND still `$emit` the event so a host that wants to observe can — non-breaking). In consumer-managed mode, just `$emit` as today.
- `useListView` does the sidebar wiring via the `sidebarState` it's given — so the embedded `CnIndexSidebar` (search box / columns / facets) works without extra wiring in self-fetch mode. (The hoisted-sidebar path via `cnIndexSidebarConfig` still works — it reads `resolvedSidebar`/`hoistedSidebarProps` which are config-driven, unchanged.)

**Backwards compat:** every existing consumer-managed `CnIndexPage` passes `objects` (and usually `loading`/`pagination`/etc.) ⇒ `selfFetch = false` ⇒ zero behaviour change. Regression test enforces it.

## B) `pages[].config.filter` → `CnIndexPage.filter`

New prop `filter: { type: Object, default: null }`. In `selfFetch` mode, after building `useListView`, resolve the filter once (and on `$route.params` change): for each `[k, v]` in `filter`, if `v` is a string starting with `@route.` → `v = $route.params[v.slice('@route.'.length)]`; if `v` starts with `:` → `v = $route.params[v.slice(1)]`; else literal. Pass the resolved object as a *fixed* filter into `useListView`'s fetch params (merged under the user's `activeFilters`, so it's not user-clearable). `useListView`'s `buildFetchParams` already spreads `activeFilters`; add an `opts.fixedFilters` to `useListView` that's always merged in (small additive change to `useListView`). No effect in consumer-managed mode (the consumer owns the fetch). Schema: `index` & `logs` page `config` gains `filter: { type:"object", additionalProperties:true }`.

## C) `columns[].aggregate` → CnDataTable

Schema: `$defs.column` gains
```jsonc
"aggregate": {
  "type": "object",
  "required": ["schema", "op"],
  "additionalProperties": false,
  "description": "Render this cell as a count of related objects. The cell value is the number of `schema` objects matching `where` (with `@self.<path>` interpolated per-row from the parent row). `op` is \"count\" for now (sum/min/max/avg are a planned follow-up). `register` defaults to the page's `config.register` (CnIndexPage fills it in before passing columns to CnDataTable).",
  "properties": {
    "register": { "type": "string" },
    "schema":   { "type": "string" },
    "op":       { "type": "string", "enum": ["count"] },
    "where":    { "type": "object", "additionalProperties": true }
  }
}
```
`CnIndexPage` (both modes): before passing `columns` down to `CnDataTable`, map each column with an `aggregate` lacking `register` → `{ ...col, aggregate: { ...col.aggregate, register: col.aggregate.register || this.effectiveRegisterSlug } }` (so manifests can omit `register`).

`CnDataTable`:
- `data()` adds `aggregateValues: {}` (`{ [rowKey]: { [colKey]: number } }`), `aggregateLoading: false`.
- `watch: { rows: 'loadAggregates', effectiveColumns: 'loadAggregates' }`, plus a call in `mounted()`.
- `loadAggregates()`: `const aggCols = this.effectiveColumns.filter(c => c.aggregate && c.aggregate.op === 'count')`; if none, return. `this.aggregateLoading = true`. For each `row` × each `aggCol`: `const where = interpolate(aggCol.aggregate.where, row)` (replace any string value `"@self.<path>"` with `getCellValue(row, path)`); `axios.get(generateUrl(\`/apps/openregister/api/objects/\${aggCol.aggregate.register}/\${aggCol.aggregate.schema}\`), { params: { ...where, _limit: 0 } })` → `const n = res.data?.total ?? res.data?.results?.length ?? 0`; `this.$set(this.aggregateValues, String(row[this.rowKey]), { ...(this.aggregateValues[...] || {}), [aggCol.key]: n })`. All wrapped in `Promise.all`, each request's failure caught individually (cell → `'—'`, `console.warn`). `finally { this.aggregateLoading = false }`. (A `requestId` guard so a stale batch doesn't clobber a newer one when `rows` changes mid-flight.)
- Cell render: a new `cellValue(row, col)` helper — `if (col.aggregate) { const v = this.aggregateValues[String(row[this.rowKey])]?.[col.key]; return v === undefined ? (this.aggregateLoading ? '…' : '—') : v } return this.getCellValue(row, col.key)`. The template's `<slot :name="'column-'+col.key" :value="...">` and the `<CnCellRenderer :value="...">` both use `cellValue(row, col)` instead of `getCellValue(row, col.key)`.
- Imports: `axios` from `@nextcloud/axios`, `generateUrl` from `@nextcloud/router` (both already used elsewhere in the lib).

`op: "count"` only this change. The column-config contract is forward-compatible: `sum`/`min`/`max`/`avg` (each needing `field`) widen the `op` enum + add a `field` property + the corresponding client-side reduce later; a server-side faceted-batch optimisation (one request per aggregate column returning per-parent counts) is a behind-the-scenes follow-up that doesn't change the manifest contract.

## Files touched
- `src/components/CnIndexPage/CnIndexPage.vue` — self-fetch mode (`setup()` + `effective*` computeds + handler routing + `schema: [Object,String]` + `filter` prop + the `aggregate.register` defaulting).
- `src/components/CnDataTable/CnDataTable.vue` — `aggregate` columns (`aggregateValues`/`aggregateLoading`/`loadAggregates`/`cellValue`).
- `src/composables/useListView.js` — `opts.fixedFilters` (always-merged filter map).
- `src/schemas/app-manifest.schema.json` — `$defs.column.aggregate`; `index`/`logs` `config.filter`.
- `docs/migrating-to-manifest.md`, `docs/components/cn-index-page.md`, `docs/components/cn-data-table.md`, `src/components/CnIndexPage/CnIndexPage.md`, `src/components/CnDataTable/CnDataTable.md`.
- `tests/components/CnIndexPage*.spec.js` (new self-fetch + filter cases), `tests/components/CnDataTable.spec.js` (new aggregate cases), `tests/composables/useListView.spec.js` (fixedFilters case if one exists; else add one).

## Seed Data
N/A — no OpenRegister schemas/registers introduced or modified.

## Quality gates
`npm test` green; `npm run lint` introduces no new errors; `npm run build` produces the `dist` bundles; `npm run check:docs` 88/88; the manifest fixtures still validate.

## Open questions
- Should `selfFetch` be opt-IN via an explicit `self-fetch` boolean prop on `CnIndexPage` instead of inferred from `register`+`schema`+no-`objects`? — Inferred is chosen so manifests need no extra flag and consumers are unaffected (they pass `objects`). If a consumer ever sets `register`+`schema` *and* manages `objects`, they pass `objects` ⇒ inference correctly yields `false`. Revisit only if a real conflict surfaces.
