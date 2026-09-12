# CnStatWidget

Single-value KPI card (`Statistic / KPI`). Resolves one number from an OpenRegister `source` block at runtime (via `generateUrl` + the aggregate API) and renders it as a large formatted figure with an optional icon, caption, and click-through route. Registered in the dashboard widget catalog under the `stat` type and configured by [`CnStatWidgetForm`](./cn-stat-widget-form.md).

## Content shape

```json
{
  "label": "Open leads",
  "icon": "Cash",
  "valueColor": "#0082c9",
  "caption": "vs previous period",
  "format": { "style": "number", "currency": "EUR", "decimals": 0 },
  "source": { "register": "pipelinq", "schema": "lead", "metric": "count", "field": "", "filter": {} }
}
```

## Endpoint binding (Wave 2, #91)

Instead of an OpenRegister `source`, the tile can bind to an arbitrary app REST endpoint through the shared [`useEndpointSource`](../utilities/composables/use-endpoint-source.md) engine — token-resolved `params`, per-`(url+params)` request dedup + short-TTL cache (four tiles reading one overview endpoint issue ONE request), and `cn:page:refresh` / `cn:widget:refresh` refresh wiring. **Exactly one of `source` | `endpointSource`** (validator-enforced; `endpointSource` wins when both slip through).

```json
{
  "label": "Revenue",
  "icon": "CashMultiple",
  "format": { "style": "currency", "currency": "EUR", "decimals": 0 },
  "endpointSource": {
    "url": "/apps/pipelinq/api/analytics/commercial",
    "params": { "period": "@workspace.datePreset?" }
  },
  "valueField": "revenue",
  "previousField": "previousPeriod.revenue",
  "goodDirection": "up",
  "variantWhen": [
    { "op": "gte", "value": 100000, "variant": "success" },
    { "op": "lt", "value": 10000, "variant": "warning", "icon": "AlertOutline" }
  ],
  "clickRoute": "leads"
}
```

- `valueField` — dot-path into the payload for the displayed value (omitted = the payload itself).
- `previousField` — previous-period value → **trend sublabel** (arrow + percent-vs-previous, the pipelinq KPI contract), tinted good/bad by `goodDirection` (`'up'` default).
- `deltaField` — a server-computed delta percent; wins over `previousField`.
- `variantWhen` — first-match threshold rules `[{ op: eq|neq|gt|gte|lt|lte, value, variant, icon? }]`; the matched `variant` (`default|primary|success|warning|error`, plus `danger` as an error alias) re-tints the value + icon circle, `icon` overrides `content.icon`.
- `variant` — the tile's **resting** colour, from the same set as `variantWhen`. It is the lowest-priority tint: a matched `variantWhen` rule wins, and so does the `limit` warning. Use it for a tile whose colour is a property of *what it counts* ("overdue" is always red) rather than of the current number; use `variantWhen` when the colour is a statement about the value. An unrecognised name is ignored rather than emitted, so a typo yields the default tint instead of a broken style.
- `caption` — the small line under the value. `{token}` placeholders are resolved against the fetched payload, dot-paths included, so a tile can carry a secondary fact without an app writing its own card to render one: `"caption": "{levelName} · {currentStreakDays}-day streak"`. A token that resolves to nothing collapses to an empty string (never the literal `{token}`), and the result is whitespace-collapsed so a missing middle field does not leave a gap. Interpolation applies to `endpointSource` payloads; a caption with no `{` is passed through untouched, and is translated via `translate` first either way.
- `clickRoute` — whole-tile click-through (alias of `route`; `route` wins when both are set).
- `format` styles: `number`, `currency`, `percent`, `duration-hours` (`42.5h`), `decimal` (one fraction digit by default).
- `limitField` / `limit` — render the tile as a **capacity pair** (`0 / 100`). `limitField` is a dot-path into the payload, so a server-configured quota is read live instead of duplicated in the manifest; `limit` is a static number. The limit is formatted with the value's own `format` minus `prefix`/`suffix` (a suffix belongs to the pair, not to each half, so `0 % / 100 %` is never produced). Reaching the limit tints the tile `warning` — unless a `variantWhen` rule already matched, which always wins.
- `dateRange` — opts the tile into a period. Present and empty (`{}`) follows the ancestor `CnDashboardPage` range; add `presets` (`[{ id, label?, from?, to? }]`) to render a per-tile picker in the label row that overrides it. The active range is exposed to `endpointSource` as `@range.from` / `@range.to` / `@range.preset`.

  A tile that declares **no** `dateRange` is unaffected by the page range. That is deliberate: adding a range to an existing dashboard must not silently change what its tiles request.

### Quota tile

```json
{
  "id": "quota-schedules",
  "type": "stat",
  "content": {
    "label": "Schedules",
    "icon": "CalendarClock",
    "endpointSource": { "url": "/apps/hermiq/api/tenant-ops/quota" },
    "valueField": "schedules.count",
    "limitField": "schedules.limit"
  }
}
```

## Reading a field off the record (`objectField`)

The two modes above ask a server "how many". `objectField` asks the record the detail page has already loaded, so the tile costs no request at all. It is what lets a KPI row headline a case's type or its assignee beside the counts, instead of those facts sitting three rows down in the properties grid.

```json
{
  "type": "stat",
  "content": {
    "label": "Case type",
    "icon": "FileTree",
    "objectField": {
      "field": "caseType",
      "resolve": { "register": "dossiq", "schema": "caseType", "labelField": "title" }
    }
  }
}
```

A plain scalar needs no `resolve`, and `objectField: "priority"` is accepted as shorthand for `{ field: "priority" }`.

`resolve` is for a field holding a reference uuid, which is not something to show a person. The label is looked up through the shared object store, so per-schema caching and in-flight dedup come for free. It is opt-in rather than inferred: guessing that a string looks like a uuid would turn a legitimate identifier into a failed fetch.

A non-numeric value renders as text, because `formatMetricValue` returns `String(value)` for anything non-finite.

## Showing a state as a badge (`display`)

`display: "badge"` renders the value as [`CnStatusBadge`](./cn-status-badge.md) instead of as a headline figure. A status is a state, not a quantity, and a state set in 32px type reads as a number that went wrong.

```json
{
  "type": "stat",
  "content": {
    "label": "Status",
    "display": "badge",
    "emptyText": "Unknown",
    "objectField": {
      "field": "status",
      "resolve": {
        "register": "dossiq",
        "schema": "statusType",
        "labelField": "name",
        "variantField": "isFinal",
        "variantMap": { "true": "success", "false": "info" }
      }
    }
  }
}
```

The badge takes its colour from the first rule that names one: an `overrides` match, a `variantWhen` rule, the limit warning, the resolved row, then the static `variant`. `danger` is accepted as an alias of `error`, and a name the badge does not know is skipped so the next rule decides.

`resolve.variantField` names a field on the looked-up row and `resolve.variantMap` maps its value to a variant, so a status colours itself from its own record rather than from a colour list copied into every manifest. Without a map, a row value that is already a variant name is used as is.

`emptyText` replaces the dash for a value that is empty or that the lookup could not resolve. It is translated like `label` and `caption`. Without it the raw value stays visible, because a blank tile says nothing at all.

## Recolouring from the record (`overrides`)

`overrides` tests the bound record and replaces the label, the colour and the icon of the tile. The first match wins.

```json
{
  "overrides": [
    { "when": { "field": "suspended" }, "label": "Suspended", "variant": "warning", "icon": "PauseCircle" }
  ]
}
```

`when` takes the `visibleWhen` comparison grammar, so `{ field, op, value }` works alongside the truthiness form above. An override outranks `emptyText`, which is what makes a suspended record with no status still read as suspended. It recolours the plain text value too, not only the badge.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `object` | `{}` | The KPI config blob (`label`, `icon`, `format`, `source` or `endpointSource` + `valueField`/`limitField`/`dateRange`/`previousField`/`deltaField`/`variantWhen`/`clickRoute`, …). |
| `translate` | `function` | `null` | Translate function for the `label` / `caption` source strings. Falls back to the injected `cnTranslate` (identity by default). |

## Notes

- **An unresolvable reference shows the raw uuid, not a blank.** A blank KPI says nothing at all, so an id the store cannot resolve stays visible, the same way `CnFkResolveCell` behaves.


- `source` supports the OpenRegister-backed kinds (`metric: 'count' \| 'sum' \| 'avg' \| …`) and a legacy `{ kind: 'endpoint', url }` form for arbitrary endpoints (uncached; prefer `endpointSource`).
- Self-contained card surface — rendered flush and centred (no inner scrollbar).
- Filter tokens (`@page.*`, `@object.*`, `@workspace.*`, `@range.*`) are resolved from injected dashboard/detail context when present.
- The tile injects `cnDashboardDateRange` — the same ref `CnChartWidget` reads — so a tile and a chart on one dashboard always agree on the period.
