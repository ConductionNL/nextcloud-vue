# CnDeltaWidget

Comparison / delta card. Resolves two OpenRegister aggregates (a current and a previous window) at runtime and renders the current value plus the signed percentage change, coloured by whether the movement is "good" (`goodDirection`). Registered under the `delta` type and configured by [`CnDeltaWidgetForm`](./cn-delta-widget-form.md).

## Content shape

```json
{
  "label": "Revenue",
  "icon": "Cash",
  "format": { "style": "currency", "currency": "EUR", "decimals": 0 },
  "source": {
    "register": "pipelinq", "schema": "lead", "metric": "sum", "field": "value",
    "goodDirection": "up",
    "current": { "filter": {} },
    "previous": { "filter": {} }
  }
}
```

## Endpoint binding (Wave 2, #91)

Instead of the two OpenRegister legs, the tile can read BOTH values from one app REST payload through the shared [`useEndpointSource`](../utilities/composables/use-endpoint-source.md) engine (token-resolved params, request dedup + short-TTL cache, `cn:page:refresh` / `cn:widget:refresh` wiring). **Exactly one of `source` | `endpointSource`** (validator-enforced).

```json
{
  "label": "Revenue",
  "format": { "style": "currency", "currency": "EUR", "decimals": 0 },
  "endpointSource": {
    "url": "/apps/pipelinq/api/analytics/commercial",
    "params": { "period": "@workspace.datePreset?" }
  },
  "valueField": "revenue",
  "previousField": "previousPeriod.revenue",
  "goodDirection": "up"
}
```

- `valueField` / `previousField` — dot-paths into the payload for the current / previous values (the pipelinq `previousPeriod` contract); the delta percent is computed client-side.
- `deltaField` — a server-computed delta percent; wins over `previousField`.
- In endpoint mode `goodDirection` lives at the content top level (`source.goodDirection` still wins for the OpenRegister form).

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `object` | `{}` | The delta config blob (`label`, `format`, `source` with `current`/`previous` — or `endpointSource` + `valueField`/`previousField`/`deltaField`). |

## Notes

- `goodDirection` (`'up'`/`'down'`) decides whether a rise renders as positive (green) or negative (red).
- Self-contained card surface — rendered flush and centred.
