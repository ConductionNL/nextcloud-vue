# CnDeltaWidgetForm

Config sub-form for the `delta` ([`CnDeltaWidget`](./cn-delta-widget.md)) dashboard widget. Drives `CnAddWidgetModal` and the cog style editor. Collects the OpenRegister data source, a "good direction", and per-window (current / previous) filters plus presentation (label, icon, number format).

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
- The current and previous windows each carry their own filter so the same metric is compared across two periods.
