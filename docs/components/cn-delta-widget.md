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

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `object` | `{}` | The delta config blob (`label`, `format`, `source` with `current`/`previous`). |

## Notes

- `goodDirection` (`'up'`/`'down'`) decides whether a rise renders as positive (green) or negative (red).
- Self-contained card surface — rendered flush and centred.
