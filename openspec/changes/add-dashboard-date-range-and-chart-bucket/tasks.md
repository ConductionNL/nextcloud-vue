# Tasks: add-dashboard-date-range-and-chart-bucket

## 1. CnDateRangePicker — new component

- [x] 1.1 Create `src/components/CnDateRangePicker/` with
  `CnDateRangePicker.vue` and `index.js` barrel.
- [x] 1.2 Implement `CnDateRangePicker.vue`:
  - props: `value: { from, to, preset }`, `presets: Array`,
    `disabled: Boolean`
  - emits: `input` with `{ from, to, preset }`
  - layout: two `NcDateTimePicker`s + a preset `NcSelect`,
    horizontally laid out with `cn-` CSS classes and NC CSS vars
  - selecting a non-`custom` preset auto-fills both pickers from
    `now − days` → `now`; `custom` keeps the inputs editable
  - EUPL-1.2 SPDX in the docblock; JSDoc on every prop / event / slot.

## 2. Date-range header on CnDashboardPage

- [x] 2.1 Add the `dateRange` prop to `CnDashboardPage.vue` (default
  `null`); declare the `date-range-change` emit; provide
  `cnDashboardDateRange` unconditionally.
- [x] 2.2 Render the `CnDateRangePicker` row between the header and
  the grid when `dateRange?.enabled === true`. Scoped styles use
  `cn-dashboard-page__date-range`.
- [x] 2.3 Resolve initial state: explicit `dateRange.default` →
  rehydrated `localStorage` (when `persistKey`) → `last-7`.
- [x] 2.4 On any picker change: update the provided ref, emit
  `date-range-change`, and persist to `localStorage` when
  `persistKey` set. Wrap storage in try/catch.
- [x] 2.5 Update `CnDashboardPage.md` doc page: document the new
  prop, event, `persistKey`, default presets, and provide/inject
  contract.

## 3. Bucket data-source branch in useDataSource

- [x] 3.1 Extend `useDataSource.js`:
  - new `buildBucketQuery({ schemaSlug, filter, bucket })` helper
    emitting the document above
  - new `resolveBucketSelectors(bucket, schemaSlug)` helper
  - branch `dataSource.bucket` in `buildQuery` and
    `resolveSelectors`
  - normalize `interval` (uppercased, validated against the
    `TimeInterval` set) and `metric` (uppercased, validated against
    the `AggregationMetric` set) before emission
  - throw a clear error (sync, surfaced via `error.value` by
    returning `null` query + a separate error ref propagation) when
    `metric != count` and `metricField` is missing, or when an
    invalid interval / metric is given
- [x] 3.2 Pass the `from` / `to` variables as a reactive object
  computed from `inject('cnDashboardDateRange', ref(null))` +
  `bucket.staticRange`. Return `null` query when neither resolves.
- [x] 3.3 Export `buildBucketQuery` from the composable + the barrel
  so unit tests can hit it directly.

## 4. CnChartWidget wiring

- [x] 4.1 Add `inject: { cnDashboardDateRange: { default: () =>
  ref(null) } }`.
- [x] 4.2 Pipe the inject + `dataSource.bucket.staticRange` into the
  variables ref consumed by `useDataSource`.
- [x] 4.3 Verify the existing `resolvedSeries` / `resolvedCategories`
  computeds still pull from `dsData` (no template changes needed).
- [x] 4.4 Update `CnChartWidget.md` doc page: add a `bucket`
  shorthand section with the manifest example + the inject contract
  paragraph.

## 5. Public-API exports

- [x] 5.1 Export `CnDateRangePicker` from `src/components/index.js`
  and `src/index.js`.
- [x] 5.2 Export `buildBucketQuery` from `src/composables/index.js`
  and `src/index.js` (mirrors existing `buildCountQuery`).

## 6. Tests

- [x] 6.1 `tests/composables/useDataSource.spec.js` — add cases:
  - `bucket` shorthand builds the right query + selectors
  - `interval` is case-insensitive
  - unknown `interval` surfaces an error and does NOT fire
  - SUM without `metricField` surfaces an error and does NOT fire
  - inject + variables flow when `cnDashboardDateRange` is supplied
  - null range → null query (no fetch)
- [x] 6.2 `tests/composables/useGraphQL.spec.js` — pin `[]` flat-map
  behaviour with a `groups[].value` + `groups[].key` fixture
  (already implicitly tested elsewhere; add a focused case).
- [x] 6.3 `tests/components/CnDateRangePicker.spec.js` — preset
  change emits, custom keeps editable, disabled prop forwards.
- [x] 6.4 `tests/components/CnDashboardPage.spec.js` — add
  date-range cases: prop omitted renders nothing, enabled renders
  picker, change emits + persists + updates provide, rehydrate
  from localStorage on mount, storage failure non-fatal.
  (Covered in dedicated `CnDashboardPageDateRange.spec.js`.)

## 7. Docs

- [x] 7.1 Create `docs/components/cn-date-range-picker.md`.
- [x] 7.2 Update `docs/components/cn-dashboard-page.md` with the new
  prop / event / provide.
- [x] 7.3 Update `docs/components/cn-chart-widget.md` with the
  `bucket` shorthand.

## 8. Quality gates

- [x] 8.1 `npm run lint` — re-run in nv-final batch; 0 errors across
  the whole tree (435 pre-existing `jsdoc/reject-any-type` warnings,
  none in this spec's touched files).
- [x] 8.2 `npm test` — green for the components/composables landed
  by this spec (`CnDateRangePicker.spec.js`,
  `CnDashboardPageDateRange.spec.js`, `useDataSource.spec.js`,
  `useGraphQL.spec.js`). Pre-existing unrelated failures
  (`CnAppRoot.spec.js` guardError path,
  `CnDetailPageSchemaDriven.spec.js` `objectStore.subscribe` warn)
  carried in from `origin/development`.
- [x] 8.3 `npm run check:docs` — re-run in nv-final batch; all 218
  public exports documented, all 127 component docs cover props+slots.
- [x] 8.4 `npm run check:jsdoc` — re-run in nv-final batch; all 147
  components meet baseline (`CnChartWidget`, `CnDateRangePicker`,
  `CnDashboardPage` all 100%).
- [x] 8.5 `cd docusaurus && npm run prebuild:docs` — executed in
  nv-final batch (docusaurus deps reachable via workspace symlink);
  regenerated `docs/components/_generated/*` partials committed in
  7b624049.
