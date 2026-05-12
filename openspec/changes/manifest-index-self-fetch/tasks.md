# Tasks — `type:"index"` manifest pages: self-fetch + `config.filter` + `columns[].aggregate`

> **Status:** PR #1 shipped §1.1/§1.3 + §2 (`$defs.column.aggregate` + `columns[].aggregate` in `CnDataTable`) + the §5.3/§6.1 docs+tests for it (nextcloud-vue #222 → `beta`). PR #2 (this branch, `feat/cnindexpage-self-fetch`) ships §3 (`CnIndexPage` store-backed self-fetch via `useListView` — manifest `type:"index"` pages now render rows), §4 (`useListView.fixedFilters`), §5.1/§5.2 docs, §6.2/§6.3 tests, §7 build & quality. §1.2 dropped — `pages[].config` is already `additionalProperties:true` so `config.filter` needs no schema change (see REQ-MISF-4).

## 1. Schema
- [x] 1.1 `$defs.column` — add `aggregate` (`{register?:string, schema:string, op:enum["count"], where:object}`, `additionalProperties:false`, with the description from design.md).
- [x] 1.2 ~~`index` + `logs` page `config` — add `filter`~~ — **dropped.** `pages[].config` is `additionalProperties:true`, so `config.filter` flows through `CnPageRenderer`'s `config` spread with no schema change (REQ-MISF-4).
- [x] 1.3 No schema `version` bump (additive). `validateManifest` accepts a column carrying `aggregate` and an index page carrying `config.filter`.

## 2. CnDataTable — `columns[].aggregate` (`op:"count"`)
- [x] 2.1 Import `axios` (`@nextcloud/axios`) and `generateUrl` (`@nextcloud/router`).
- [x] 2.2 `data()` adds `aggregateValues: {}`, `aggregateLoading: false`, `aggregateRequestId: 0`.
- [x] 2.3 `loadAggregates()` — filter `effectiveColumns` for `c.aggregate && c.aggregate.op === 'count'`; if none, clear `aggregateValues` and return. Bump+capture `aggregateRequestId`. For each `row × aggCol`: interpolate `@self.<path>` in `aggregate.where` from the row (via `getCellValue`), `axios.get(generateUrl('/apps/openregister/api/objects/' + aggCol.aggregate.register + '/' + aggCol.aggregate.schema), { params: { ...where, _limit: 0 } })` → `n = data?.total ?? data?.results?.length ?? 0` → `this.$set(this.aggregateValues, String(row[rowKey]), { ...(prev||{}), [aggCol.key]: n })`. `Promise.all`; per-request catch (`console.warn`, cell → `'—'`); a stale-request guard (only commit if `id === aggregateRequestId`); `finally` clears `aggregateLoading` (only if not superseded).
- [x] 2.4 `watch: { rows: { handler: 'loadAggregates' }, effectiveColumns: { handler: 'loadAggregates', deep: false } }` + call `loadAggregates()` in `mounted()`.
- [x] 2.5 `cellValue(row, col)` method — `col.aggregate` ⇒ cached value or `'…'`/`'—'`; else `getCellValue(row, col.key)`. Template: the `<slot #column-{key} :value>` and the `<CnCellRenderer :value>` use `cellValue(row, col)`.

## 3. CnIndexPage — self-fetch mode
- [x] 3.1 Widen `schema` prop to `[Object, String]` (was `Object`) — backwards-compatible.
- [x] 3.2 Add `filter` prop (`Object`, default `null`).
- [x] 3.3 `setup()` — `isSelfFetch = !!(props.register && props.schema) && !objectsProvided` (`objectsProvided` = `'objects' in instance.proxy.$options.propsData`). When self-fetch: `objectType = '${register}-${schema}'`; `objectStore = useObjectStore()`; `objectStore.registerObjectType(objectType, { register, schema })`; `sidebarState = inject('sidebarState', null) ?? inject('objectSidebarState', null)`; `list = useListView(objectType, { objectStore, sidebarState, defaultSort, defaultPageSize, fixedFilters: <getter, see 3.6> })`. Expose `list` + `isSelfFetch` from `setup()`.
- [x] 3.4 `effective*` computeds: `isSelfFetchMode`, `effectiveObjects` / `effectiveLoading` / `effectivePagination` / `effectiveSchema` (string-slug case: `list.schema.value`) / `effectiveSortKey` / `effectiveSortOrder` / `effectiveSearchValue` / `effectiveVisibleColumns` / `effectiveActiveFilters` — return the `list.*` value in self-fetch mode, else the prop. Template binds to these.
- [x] 3.5 Handler routing: `onSearchEvent`/`onSortEvent`/`onPageEvent`/`onFilterEvent`/`onColumnsEvent`/`onRefreshEvent` — in self-fetch mode call `list.onSearch`/`onSort`/`onPageChange`/`onFilterChange` / set `list.visibleColumns` / `list.refresh()` (and still `$emit` the event); else just `$emit` (current behaviour). Wired on the template `@search`/`@sort`/`@page-changed`/`@filter-change`/`@columns-change`/`@refresh` and on the hoisted-sidebar `publishHoistedSidebar` listeners.
- [x] 3.6 `config.filter` → `fixedFilters` getter: for each `[k,v]`, `v.startsWith('@route.')` ⇒ `$route.params[v.slice(7)]`, `v.startsWith(':')` ⇒ `$route.params[v.slice(1)]`, else literal `v`. Re-read on every fetch; also `watch '$route.params'` → `list.refresh(1)`. No-op in consumer-managed mode.
- [x] 3.7 `tableColumns` computed — when `register` is a string, default each `aggregate.register ??= register` before passing `columns` to `CnDataTable`.
- [x] 3.8 Hoisted-sidebar path (`publishHoistedSidebar` / `hoistedSidebarProps`) and the embedded `CnIndexSidebar` keep working: `hoistedSidebarProps` reads `effectiveSchema`/`effectiveSearchValue`/`effectiveVisibleColumns`/`effectiveActiveFilters`, the sidebar event listeners route through the §3.5 handlers, and `useListView`'s own `sidebarState` wiring carries the live search/columns/facets state.

## 4. useListView — `opts.fixedFilters`
- [x] 4.1 `opts.fixedFilters` — a plain object OR a function/getter returning one. `resolveFixedFilters()` helper; in `buildParams(page)` spread it *after* `activeFilters` (skipping `undefined`/`null`/`''`) so the fixed entries always win. Backwards-compatible (default `{}`). JSDoc updated.

## 5. Docs
- [x] 5.1 `docs/migrating-to-manifest.md` — "Self-fetch index pages" section (`type:"index"` pages self-fetch from `register`+`schema`; passing `objects` opts into consumer-managed) + "Scoping a list to a parent — `config.filter`" (`@route.X` / `:X`); the existing "Aggregate columns" / "Column widgets" forward-pointers updated to link it.
- [x] 5.2 `docs/components/cn-index-page.md` + `src/components/CnIndexPage/CnIndexPage.md` — `schema` now `Object|String`, new `filter` prop, "Self-fetch mode" section. `docs/utilities/composables/use-list-view.md` — `options.fixedFilters` parameter + the request-params row.
- [x] 5.3 `docs/components/cn-data-table.md` + `src/components/CnDataTable/CnDataTable.md` — `columns[].aggregate`.

## 6. Tests
- [x] 6.1 `tests/components/CnDataTable.spec.js` — column with `aggregate:{register,schema,op:"count",where:{x:"@self.id"}}`: mock `@nextcloud/axios`, assert the cell shows the returned `total`; `'…'` while pending; per-row `@self.<path>` interpolation; per-request failure → `'—'` + warn.
- [x] 6.2 `tests/components/CnIndexPageSelfFetch.spec.js` — `register`+`schema` (string slug) + no `objects` ⇒ `registerObjectType('decidesk-decision', …)` + `fetchCollection('decidesk-decision', …)` called; passing `objects` ⇒ consumer-managed (no store calls); `filter:{ intakeForm:"@route.id", archived:false }` + `$route.params.id` ⇒ fetch params include `intakeForm:"form-7"` + `archived:false`; no `register`/`schema` ⇒ no store calls. (`jest.mock('../../src/store/index.js')` → fake store.)
- [x] 6.3 `tests/composables/useListView.spec.js` — `fixedFilters` always merged into fetch params (mount, search, refresh), after `activeFilters` (wins a colliding `activeFilter`), getter re-read each fetch, no `fixedFilters` ⇒ params unchanged (`{_limit:20,_page:1}`).

## 7. Build & quality
- [x] 7.1 `npm test` — 88 suites / 1250 tests green (the 1 failing suite is pre-existing: `CnMapWidget.spec.js` — `leaflet` not installed).
- [x] 7.2 `npm run lint` — no new errors (the 2 errors are pre-existing: `leaflet` in `CnMapWidget`, `@microsoft/fetch-event-source` in `useAiChatStream`).
- [x] 7.3 `npm run build` succeeds (dist bundles; the unresolved deps are pre-existing externals).
- [x] 7.4 `npm run check:docs` green (88/88 component docs, 153 exports).

## 8. Wrap-up
- [x] 8.1 Update this tasks.md.
- [ ] 8.2 PR → `beta`; admin-merge.
