# CnStatWidgetForm

Config sub-form for the `stat` ([`CnStatWidget`](./cn-stat-widget.md)) dashboard widget. Drives both `CnAddWidgetModal` and the cog style editor. Collects the OpenRegister data source (register, schema, aggregation, optional value field, filters) plus presentation (label, icon, value colour, caption, number/currency format).

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `editingWidget` | `object\|null` | `null` | The placement being edited (pre-fills from `editingWidget.content`), or `null` in create mode. |
| `value` | `object` | defaults | Initial content values when not editing. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:content` | `object` | Emitted with the assembled content blob on every field change. |

## Notes

- `validate()` requires `register` + `schema` (and a value `field` for non-count metrics).
- Schema properties are self-fetched from OpenRegister when register + schema are set.
