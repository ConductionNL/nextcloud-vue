# CnGaugeWidget

Gauge / utilization card. Resolves a value and a target from OpenRegister at runtime and renders a radial gauge of value-against-target, coloured by warn/danger thresholds. Registered under the `gauge` type and configured by [`CnGaugeWidgetForm`](./cn-gauge-widget-form.md).

## Content shape

```json
{
  "label": "Capacity used",
  "format": { "style": "number", "decimals": 0 },
  "source": { "register": "pipelinq", "schema": "lead", "metric": "count", "field": "", "filter": {} },
  "target": { "kind": "static", "value": 100, "metric": "count", "field": "", "filter": {} },
  "thresholds": { "warn": 80, "danger": 100, "invert": false }
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `object` | `{}` | The gauge config blob (`label`, `format`, `source`, `target`, `thresholds`). |
| `translate` | `function` | `null` | Translate function for the `label` source string. Falls back to the injected `cnTranslate` (identity by default). |

## Notes

- `target.kind` is `'static'` (a fixed number) or a second OpenRegister aggregate.
- `thresholds.invert` flips the colour ramp for "lower is worse" metrics.
- Self-contained card surface — rendered flush and centred.
