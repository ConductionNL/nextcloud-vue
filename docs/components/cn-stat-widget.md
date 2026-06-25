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

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `object` | `{}` | The KPI config blob (`label`, `icon`, `format`, `source`, …). |

## Notes

- `source` supports the OpenRegister-backed kinds (`metric: 'count' \| 'sum' \| 'avg' \| …`) and an `{ kind: 'endpoint', url }` form for arbitrary endpoints.
- Self-contained card surface — rendered flush and centred (no inner scrollbar).
- Filter tokens (`@page.*`, `@object.*`, `@workspace.*`) are resolved from injected dashboard/detail context when present.
