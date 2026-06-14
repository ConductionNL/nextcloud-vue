# add-dashboard-date-range-and-chart-bucket

## Why

Dashboards across the Conduction fleet (decidesk, mydash, opencatalogi,
pipelinq, procest, scholiq) want a single date-range header that filters
every chart on the page, plus a way to wire chart widgets to time-bucketed
series without each app shipping bespoke GraphQL.

OpenRegister now exposes an ad-hoc `groupBy: GroupByInput` argument on
every auto-generated list query, returning `groups: [GroupBucket!]` with
`{ key, value }` entries (PR ConductionNL/openregister#1611, spec
`openspec/changes/add-time-bucket-aggregation/specs/graphql-api/spec.md`).
This lib needs to ship the consumer-side helpers — a date-range picker,
a dashboard-scope provide/inject, and a `bucket` shorthand for the chart
widget's `dataSource` block — so manifest authors get time-bucketed
charts with one declaration.

## What

Four additive features, all backwards-compatible (every new prop has a
default; existing manifests are unchanged):

1. **`CnDashboardPage.dateRange` prop** — optional header that renders a
   date-range picker above the grid, persists the choice to
   `localStorage`, emits `@date-range-change`, AND provides a reactive
   `cnDashboardDateRange` injection key consumed by child chart widgets.
   When the prop is omitted/`null`, the header renders nothing and the
   provide value is `ref(null)` (descendants stay safe).

2. **`CnDateRangePicker` component** — new public export wrapping two
   `NcDateTimePicker`s + a preset `NcSelect`. Owns the layout so
   consumers never have to compose pickers themselves. Used internally
   by `CnDashboardPage` and exposed for bespoke screens that need the
   same control.

3. **`CnChartWidget.dataSource.bucket` shorthand** — `useDataSource`
   gains a third shape (alongside `aggregate: 'count'` and raw
   `graphql:`). The shorthand emits a `groupBy: { field, interval,
   from, to, metric?, metricField? }` against the OR endpoint and
   defaults the chart `series` / `categories` selectors to
   `<schemaSlug>.groups[].value` and `<schemaSlug>.groups[].key`.

4. **`CnChartWidget` consumes `cnDashboardDateRange`** — when the
   dashboard provides a date range AND the widget's `dataSource.bucket`
   names `fromVar` / `toVar` GraphQL variables, those variables resolve
   from the inject. Falls back to `bucket.staticRange` if the inject
   is null; if both are null the widget does NOT fire a partial query
   (renders the unavailable state instead).

## Non-goals

- Multi-axis charts / multiple bucketed series in one widget. The
  `bucket` shorthand is intentionally one schema, one series.
- A "compare with previous period" overlay. The `dateRange` event is
  rich enough that consumer apps can wire this themselves; keeping the
  built-in surface minimal lets us iterate on the comparison UX later
  without breaking the public API.
- Server-side persistence of the selected range. `persistKey` writes
  to `localStorage` only. Multi-device sync is deferred.
- A categorical (non-time) `groupBy` shorthand. The OR contract
  supports it but the chart widget's resolved-series shape would need
  per-series-name handling that doesn't compose with the existing
  `series: [{ name, data }]` flow. Authors that need categorical
  group-by today should drop down to the raw `graphql:` form; we'll
  layer a `breakdown:` shorthand in a follow-up cycle once we've seen
  two or three real consumers.

## Open questions resolved during implementation

- **Default preset when `dateRange.default` is omitted** — `last-7`
  (now − 7 d → now). Mirrors the most common case across mydash and
  decidesk dashboards, and matches the OR spec's day-bucket scenario.
- **`from`/`to` granularity** — ISO-8601 strings with UTC midnight
  boundaries (`T00:00:00.000Z` / `T23:59:59.999Z`). The OR contract
  accepts ISO-8601 verbatim, and we keep timezone semantics simple
  (no per-user TZ resolution in v1).
- **`selectByPath` extraction** — Keep in `useGraphQL.js` (already
  exported from the composables barrel). The path syntax already
  supports `groups[].value`; a focused new unit test pins the
  contract. Extracting to a separate util would just add a moving
  part without a caller benefit yet.
- **Preset selection vs. custom range** — `preset: 'custom'` keeps
  the pickers manually editable; any other preset id auto-fills both
  pickers from the preset's `days` offset and locks them visually but
  not by `:disabled` (consumer can still override via the input field
  if they really want — we don't want a surprise lockout).

## References

- `openregister/openspec/changes/add-time-bucket-aggregation/specs/graphql-api/spec.md`
  (the contract; lives in worktree `/tmp/worktrees/openregister-time-bucket-agg/`).
- `ConductionNL/openregister#1611` — the OR PR.
- Existing dashboard usage in `decidesk`, `mydash`, `opencatalogi`,
  `pipelinq`, `procest`, `scholiq`.
