# Tasks — `type:"index"` manifest pages: self-fetch + `config.filter` + `columns[].aggregate`

> **Status:** PR #1 (this branch) implements §1–2 (`$defs.column.aggregate` + `columns[].aggregate` in CnDataTable) + the §5.3/§6.1 docs+tests for it — shippable on its own (usable today via `CnTableWidget` / any direct `CnDataTable` consumer). §3 (`CnIndexPage` store-backed self-fetch via `useListView`) + §4 (`useListView.fixedFilters` for `config.filter`) + the rest of §5–6 are the larger follow-up PR against this same change — that's what makes manifest `type:"index"` pages render rows (and `config.filter` work) end-to-end.

## 1. Schema
- [x] 1.1 `$defs.column` — add `aggregate` (`{register?:string, schema:string, op:enum["count"], where:object}`, `additionalProperties:false`, with the description from design.md).
- [ ] 1.2 `index` + `logs` page `config` — add `filter` (`{type:"object", additionalProperties:true}`). (Confirm where the per-type configs live in the schema and add it to both `index` and `logs`.)
- [x] 1.3 No schema `version` bump (additive). Confirm `validateManifest` accepts a manifest with a column carrying `aggregate` and an index page carrying `config.filter` (add fixture cases if not already covered).

## 2. CnDataTable — `columns[].aggregate` (`op:"count"`)
- [x] 2.1 Import `axios` (`@nextcloud/axios`) and `generateUrl` (`@nextcloud/router`).
- [x] 2.2 `data()` adds `aggregateValues: {}`, `aggregateLoading: false`, `aggregateRequestId: 0`.
- [x] 2.3 `loadAggregates()` — filter `effectiveColumns` for `c.aggregate && c.aggregate.op === 'count'`; if none, clear `aggregateValues` and return. Bump+capture `aggregateRequestId`. For each `row × aggCol`: interpolate `@self.<path>` in `aggregate.where` from the row (via `getCellValue`), `axios.get(generateUrl('/apps/openregister/api/objects/' + aggCol.aggregate.register + '/' + aggCol.aggregate.schema), { params: { ...where, _limit: 0 } })` → `n = data?.total ?? data?.results?.length ?? 0` → `this.$set(this.aggregateValues, String(row[rowKey]), { ...(prev||{}), [aggCol.key]: n })`. `Promise.all`; per-request catch (`console.warn`, cell → `'—'`); a stale-request guard (only commit if `id === aggregateRequestId`); `finally` clears `aggregateLoading` (only if not superseded).
- [x] 2.4 `watch: { rows: { handler: 'loadAggregates' }, effectiveColumns: { handler: 'loadAggregates', deep: false } }` + call `loadAggregates()` in `mounted()`.
- [x] 2.5 `cellValue(row, col)` method — `col.aggregate` ⇒ cached value or `'…'`/`'—'`; else `getCellValue(row, col.key)`. Template: the `<slot #column-{key} :value>` and the `<CnCellRenderer :value>` use `cellValue(row, col)`.

## 3. CnIndexPage — self-fetch mode
- [ ] 3.1 Widen `schema` prop to `[Object, String]` (was `Object`) — backwards-compatible.
- [ ] 3.2 Add `filter` prop (`Object`, default `null`).
- [ ] 3.3 `setup()` — compute `selfFetch = !!(props.register && props.schema) && !('objects' in instance.$options.propsData || /* whatever the right "objects not supplied" check is */ )`. When `selfFetch`: `objectType = '${register}-${schema}'`; `sidebarState = inject('sidebarState', null) ?? inject('objectSidebarState', null)`; `list = useListView(objectType, { objectStore: useObjectStore(), sidebarState, defaultSort: props.defaultSort, defaultPageSize: props.pageSize, debounceMs: props.searchDebounceMs })`. Expose `list` (and `selfFetch`) from `setup()`.
- [ ] 3.4 `effective*` computeds: `effectiveObjects` / `effectiveLoading` / `effectivePagination` / `effectiveSchema` (string-slug case: use `list.schema.value`) / `effectiveSortKey` / `effectiveSortOrder` / `effectiveSearchTerm` — return the `list.*` value when `selfFetch`, else the prop. Template binds to these.
- [ ] 3.5 Handler routing: `onSearch`/`onSort`/`onPageChange`/`onFilterChange`/`onRefresh` — when `selfFetch`, call `list.onSearch`/etc. (and still `$emit` the event); else just `$emit` (current behaviour).
- [ ] 3.6 `config.filter` → resolve `@route.X` / `:X` from `$route.params` (re-resolve on `$route.params` change); pass as `opts.fixedFilters` to `useListView` (see task 4). No-op in consumer-managed mode.
- [ ] 3.7 Before passing `columns` to `CnDataTable`, default each `aggregate.register ??= effectiveRegisterSlug` (the `register` prop, a string slug).
- [ ] 3.8 Verify the hoisted-sidebar path (`publishHoistedSidebar` / `cnIndexSidebarConfig`) still works in self-fetch mode (it reads config-driven `resolvedSidebar`/`hoistedSidebarProps` — should be unchanged; `useListView`'s own `sidebarState` wiring handles the live search/columns/facets state).

## 4. useListView — `opts.fixedFilters`
- [ ] 4.1 Add `opts.fixedFilters` (a static map). In `buildFetchParams` (or wherever `activeFilters` is spread into the fetch params), spread `fixedFilters` *after* `activeFilters` so the fixed ones can't be overridden. Reactive if passed a ref/getter — accept either a plain object or a function returning one. Backwards-compatible (default `{}`).

## 5. Docs
- [ ] 5.1 `docs/migrating-to-manifest.md` — note that `type:"index"` pages self-fetch from `register`+`schema` (and that passing `objects` opts into the consumer-managed path); add a "Filtered index pages" section (`config.filter` with `@route.X`); add an "Aggregate columns" section (`columns[].aggregate`).
- [ ] 5.2 `docs/components/cn-index-page.md` + `src/components/CnIndexPage/CnIndexPage.md` — self-fetch behaviour, the `filter` prop, `schema` now `Object|String`.
- [x] 5.3 `docs/components/cn-data-table.md` + `src/components/CnDataTable/CnDataTable.md` — `columns[].aggregate`.

## 6. Tests
- [x] 6.1 `tests/components/CnDataTable.spec.js` — column with `aggregate:{register,schema,op:"count",where:{x:"@self.id"}}`: mock `@nextcloud/axios`, assert the cell shows the returned `total`; `'…'` while pending; per-row `@self.<path>` interpolation; per-request failure → `'—'` + warn.
- [ ] 6.2 `tests/components/CnIndexPage.*.spec.js` — self-fetch: `register`+`schema` (string slug) + no `objects` ⇒ `useObjectStore`/`useListView`-backed, `registerObjectType` + `fetchCollection` called, rows render from the store; passing `objects` ⇒ consumer-managed (no store calls, rows from the prop); `filter:{ id:"@route.id" }` + a `$route.params.id` ⇒ the fetch params include the interpolated filter. (Mock `useObjectStore`/`useListView` or the store as the existing CnIndexPage specs do.)
- [ ] 6.3 `tests/composables/useListView.spec.js` — `fixedFilters` always merged into the fetch params, after `activeFilters`. (Create the spec file if it doesn't exist.)

## 7. Build & quality
- [x] 7.1 `npm test` green.
- [x] 7.2 `npm run lint` — no new errors.
- [x] 7.3 `npm run build` succeeds (dist bundles).
- [x] 7.4 `npm run check:docs` green (88/88 component docs).

## 8. Wrap-up
- [x] 8.1 Update this tasks.md.
- [ ] 8.2 PR → `beta`; admin-merge.
