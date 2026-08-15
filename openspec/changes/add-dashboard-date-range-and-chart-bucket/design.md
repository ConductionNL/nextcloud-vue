# Design — Dashboard date-range header + chart time-bucket data source

## Architecture sketch

```
┌─────────────────────────── CnDashboardPage ──────────────────────────┐
│                                                                       │
│  ┌──────────── header ─────────────────────────────────────────────┐ │
│  │  title • description           [header-actions slot]            │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│  ┌──────────── date-range row (when dateRange.enabled) ────────────┐ │
│  │  <CnDateRangePicker v-model="range" :presets="…" />             │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│   provide('cnDashboardDateRange', refRange)  ← always provided        │
│                                                                       │
│  ┌──────────── widget grid ────────────────────────────────────────┐ │
│  │   CnChartWidget(s) inject('cnDashboardDateRange', null)         │ │
│  │     │                                                            │ │
│  │     └─ useDataSource(dataSource)                                 │ │
│  │         ├─ branch: aggregate === 'count'  (existing)            │ │
│  │         ├─ branch: graphql:               (existing)            │ │
│  │         └─ branch: bucket:                ← NEW                  │ │
│  │             ↑ vars: from/to from inject ⇢ static ⇢ skip query   │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────┘
```

## Provide / inject contract

```js
// In CnDashboardPage.setup()
const refRange = ref(null)              // { from, to, preset } | null
provide('cnDashboardDateRange', refRange)
```

The ref is provided **unconditionally** so descendants can always inject
without a fallback dance. When `props.dateRange?.enabled !== true`, the
ref's value stays `null` for the page's lifetime; widgets see `null`
and use their `staticRange` (or skip the query).

Descendant inject (CnChartWidget):

```js
inject: {
  cnDashboardDateRange: { default: () => ref(null) },
}
```

The default factory keeps composition-free mounts (Storybook, isolated
unit tests) safe — `inject` resolves to a fresh `ref(null)` when no
ancestor provided one.

## `dateRange` prop shape

```js
dateRange: {
  enabled: Boolean,           // default false when prop is set without it
  default?: {                 // initial value if no persisted state
    from: String,             // ISO-8601 with T..Z (UTC)
    to: String,
    preset?: String,          // e.g. 'last-7'
  },
  persistKey?: String,        // localStorage key (per consumer)
  presets?: Array<{ id, label, days|null }>,
}
```

When the prop is `null` (default), the header renders nothing. When the
prop is an object with `enabled: true`, the header renders. We treat
`{ enabled: false, ... }` as "do not render" too, so manifest authors
can toggle the feature without restructuring the rest of the block.

Default presets (used when `dateRange.presets` is omitted):

```js
[
  { id: 'today',   label: 'Today',          days: 1 },
  { id: 'last-7',  label: 'Last 7 days',    days: 7 },
  { id: 'last-30', label: 'Last 30 days',   days: 30 },
  { id: 'last-90', label: 'Last 90 days',   days: 90 },
  { id: 'custom',  label: 'Custom range',   days: null },
]
```

Default fallback (no `default`, no persisted state): `last-7`.

## `bucket` data-source shorthand

```js
dataSource: {
  register: 'openconnector',
  schema: 'call_log',
  filter: { status: 'error' },
  bucket: {
    field: 'created',
    interval: 'day',          // → DAY
    metric: 'count',          // optional, default 'count'
    metricField: null,        // required when metric != count
    fromVar: 'from',          // GraphQL variable name
    toVar: 'to',
    staticRange: null,        // optional { from, to } fallback
  },
}
```

The composable emits:

```graphql
query($from: String!, $to: String!) {
  call_log(filter: { status: "error" },
           groupBy: { field: "created", interval: DAY,
                      from: $from, to: $to })
  {
    groups { key value }
  }
}
```

`from` / `to` are passed as GraphQL variables (rather than inlined) so
the same parsed query reused across re-renders only changes the
variables ref — `useGraphQL` watches the variables ref deeply and
re-fires.

When neither inject nor `staticRange` resolves a `{from, to}` pair,
`buildBucketQuery` returns `null` and the composable's existing
"`query == null` ⇒ data stays null" path keeps the chart in its
unavailable / empty state instead of firing a half-formed query.

### Why `interval: 'day'` (lowercase string) — not `'DAY'`?

Manifests are JSON, GraphQL enums are not. Authors write `'day'` (the
same casing they'd write in English) and the composable uppercases it
when emitting GraphQL. We accept any case insensitively and validate
against `MINUTE|HOUR|DAY|WEEK|MONTH|QUARTER|YEAR` to fail loudly on
typos.

### Default selectors

```js
{ series: '<schemaSlug>.groups[].value',
  categories: '<schemaSlug>.groups[].key' }
```

The chart widget already coerces a series-of-numbers into a single
default-named line series via apexcharts, so manifest authors get a
working chart without writing a custom selector block. If they need a
different series name they fall back to the raw `graphql:` form.

### `metric` mapping

| manifest `metric` | GraphQL enum |
|-------------------|--------------|
| `count` (default) | `COUNT`      |
| `sum`             | `SUM`        |
| `avg`             | `AVG`        |
| `min`             | `MIN`        |
| `max`             | `MAX`        |

`metricField` is required when `metric !== 'count'`; the composable
throws via `error.value` rather than building a query that the server
will reject. (We mirror the server contract on the client to avoid a
GraphQL round-trip just to learn we mis-typed the request.)

## Selector path support

`selectByPath` in `useGraphQL.js` already supports `groups[].value` (the
`[]` suffix flat-maps each element's child). We confirmed by reading
the function — segments split on `.`, each segment can end in `[]`,
which triggers `next.push(...inner)` over the array. No change needed;
we pin the behaviour with a focused test (`groups[].value` against a
two-bucket fixture).

## localStorage persistence

When `dateRange.persistKey` is set:

- On mount, read `localStorage.getItem(persistKey)`; if valid JSON
  with `{from, to, preset?}` strings, rehydrate.
- On change, write `JSON.stringify({from, to, preset})`.
- Wrap reads/writes in `try/catch` (storage can throw in private
  windows / quota-exhausted iframes).

We do NOT cross-tab broadcast (BroadcastChannel / storage event). One
consumer asked for it but it's a v2 concern.

## Backwards-compatibility surface

- `CnDashboardPage`'s new `dateRange` prop defaults to `null` — every
  existing dashboard renders identically.
- The `cnDashboardDateRange` provide is unconditional, but the value
  is `ref(null)` when the feature is off. Any new descendant that
  `inject`s without a default will get a ref, not `undefined`.
- `useDataSource`'s new `bucket` branch only fires when
  `dataSource.bucket` is set — the existing `aggregate: 'count'` and
  `graphql:` branches are unchanged.
- `CnChartWidget`'s new `inject` has a `default: () => ref(null)` so
  isolated mounts (Storybook, jest with `shallowMount`) keep working.
- No exports are removed; we add three (`CnDateRangePicker`, plus the
  composable barrel keeps `useDataSource` / `useGraphQL` /
  `selectByPath`).
