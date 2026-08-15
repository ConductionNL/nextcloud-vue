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

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `object` | `{}` | The KPI config blob (`label`, `icon`, `format`, `source` or `endpointSource` + `valueField`/`limitField`/`dateRange`/`previousField`/`deltaField`/`variantWhen`/`clickRoute`, …). |
| `translate` | `function` | `null` | Translate function for the `label` / `caption` source strings. Falls back to the injected `cnTranslate` (identity by default). |

## Notes

- `source` supports the OpenRegister-backed kinds (`metric: 'count' \| 'sum' \| 'avg' \| …`) and a legacy `{ kind: 'endpoint', url }` form for arbitrary endpoints (uncached; prefer `endpointSource`).
- Self-contained card surface — rendered flush and centred (no inner scrollbar).
- Filter tokens (`@page.*`, `@object.*`, `@workspace.*`, `@range.*`) are resolved from injected dashboard/detail context when present.
- The tile injects `cnDashboardDateRange` — the same ref `CnChartWidget` reads — so a tile and a chart on one dashboard always agree on the period.
