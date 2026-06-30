# CnStatsBlockWidgetForm

Config sub-form for the `stats-block` ([`CnStatsBlockWidget`](./cn-stats-block-widget.md)) "Statistic card" dashboard widget. Drives `CnAddWidgetModal` and the cog editor. Collects the OpenRegister source (register, schema, aggregation, optional field, filters) plus presentation (title, count label, colour variant, icon).

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `editingWidget` | `object\|null` | `null` | The placement being edited (pre-fills from `editingWidget.content`), or `null` in create mode. |
| `value` | `object` | defaults | Initial content values when not editing. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:content` | `object` | Emitted with the assembled `{ title, props, dataSource }` blob on every field change. |

## Notes

- `validate()` requires `register` + `schema` (and a field for non-count metrics).
- The assembled `content` is consumed by `CnStatsBlockWidget`, which self-fetches the count from `dataSource`.
