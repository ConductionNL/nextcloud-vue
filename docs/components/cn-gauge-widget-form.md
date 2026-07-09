# CnGaugeWidgetForm

Config sub-form for the `gauge` ([`CnGaugeWidget`](./cn-gauge-widget.md)) dashboard widget. Drives `CnAddWidgetModal` and the cog style editor. Collects the value source, the target (static value or a second aggregate), warn/danger thresholds, and presentation (label, number format).

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

- `validate()` requires `register` + `schema`.
- Toggle the target between a static number and a live aggregate; thresholds drive the gauge colour.
