# Tasks: add-dashboard-date-range-and-chart-bucket

## 1. CnDateRangePicker — new component

- [ ] 1.1 Create `src/components/CnDateRangePicker/` with
  `CnDateRangePicker.vue` and `index.js` barrel.
- [ ] 1.2 Implement `CnDateRangePicker.vue`:
  - props: `value: { from, to, preset }`, `presets: Array`,
    `disabled: Boolean`
  - emits: `input` with `{ from, to, preset }`
  - layout: two `NcDateTimePicker`s + a preset `NcSelect`,
    horizontally laid out with `cn-` CSS classes and NC CSS vars
  - selecting a non-`custom` preset auto-fills both pickers from
    `now − days` → `now`; `custom` keeps the inputs editable
  - EUPL-1.2 SPDX in the docblock; JSDoc on every prop / event / slot.

## 2. Date-range header on CnDashboardPage

- [ ] 2.1 Add the `dateRange` prop to `CnDashboardPage.vue` (default
  `null`); declare the `date-range-change` emit; provide
  `cnDashboardDateRange` unconditionally.
- [ ] 2.2 Render the `CnDateRangePicker` row between the header and
  the grid when `dateRange?.enabled === true`. Scoped styles use
  `cn-dashboard-page__date-range`.
- [ ] 2.3 Resolve initial state: explicit `dateRange.default` →
  rehydrated `localStorage` (when `persistKey`) → `last-7`.
- [ ] 2.4 On any picker change: update the provided ref, emit
  `date-range-change`, and persist to `localStorage` when
  `persistKey` set. Wrap storage in try/catch.
- [ ] 2.5 Update `CnDashboardPage.md` doc page: document the new
  prop, event, `persistKey`, default presets, and provide/inject
  contract.

## 3. Bucket data-source branch in useDataSource

- [ ] 3.1 Extend `useDataSource.js`:
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
- [ ] 3.2 Pass the `from` / `to` variables as a reactive object
  computed from `inject('cnDashboardDateRange', ref(null))` +
  `bucket.staticRange`. Return `null` query when neither resolves.
- [ ] 3.3 Export `buildBucketQuery` from the composable + the barrel
  so unit tests can hit it directly.

## 4. CnChartWidget wiring

- [ ] 4.1 Add `inject: { cnDashboardDateRange: { default: () =>
  ref(null) } }`.
- [ ] 4.2 Pipe the inject + `dataSource.bucket.staticRange` into the
  variables ref consumed by `useDataSource`.
- [ ] 4.3 Verify the existing `resolvedSeries` / `resolvedCategories`
  computeds still pull from `dsData` (no template changes needed).
- [ ] 4.4 Update `CnChartWidget.md` doc page: add a `bucket`
  shorthand section with the manifest example + the inject contract
  paragraph.

## 5. Public-API exports

- [ ] 5.1 Export `CnDateRangePicker` from `src/components/index.js`
  and `src/index.js`.
- [ ] 5.2 Export `buildBucketQuery` from `src/composables/index.js`
  and `src/index.js` (mirrors existing `buildCountQuery`).

## 6. Tests

- [ ] 6.1 `tests/composables/useDataSource.spec.js` — add cases:
  - `bucket` shorthand builds the right query + selectors
  - `interval` is case-insensitive
  - unknown `interval` surfaces an error and does NOT fire
  - SUM without `metricField` surfaces an error and does NOT fire
  - inject + variables flow when `cnDashboardDateRange` is supplied
  - null range → null query (no fetch)
- [ ] 6.2 `tests/composables/useGraphQL.spec.js` — pin `[]` flat-map
  behaviour with a `groups[].value` + `groups[].key` fixture
  (already implicitly tested elsewhere; add a focused case).
- [ ] 6.3 `tests/components/CnDateRangePicker.spec.js` — preset
  change emits, custom keeps editable, disabled prop forwards.
- [ ] 6.4 `tests/components/CnDashboardPage.spec.js` — add
  date-range cases: prop omitted renders nothing, enabled renders
  picker, change emits + persists + updates provide, rehydrate
  from localStorage on mount, storage failure non-fatal.

## 7. Docs

- [ ] 7.1 Create `docs/components/cn-date-range-picker.md`.
- [ ] 7.2 Update `docs/components/cn-dashboard-page.md` with the new
  prop / event / provide.
- [ ] 7.3 Update `docs/components/cn-chart-widget.md` with the
  `bucket` shorthand.

## 8. Quality gates

- [ ] 8.1 `npm run lint` — green.
- [ ] 8.2 `npm test` — green (including the new specs).
- [ ] 8.3 `npm run check:docs` — every new public export has a doc
  page and every new prop / slot is mentioned.
- [ ] 8.4 `npm run check:jsdoc` — green (update baselines via
  `npm run jsdoc-baselines:update` only when adding new files;
  never to silence regressions on touched files).
- [ ] 8.5 `cd docusaurus && npm run prebuild:docs && cd ..` —
  regenerate partials; commit any diff.
