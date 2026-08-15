# CnObjectListWidgetForm

Config sub-form for the `object-list` / `table` ([`CnObjectListWidget`](./cn-object-list-widget.md)) dashboard widget. Drives `CnAddWidgetModal` and the cog style editor. Collects the OpenRegister source (register, schema, filter), sort field + direction, row limit, and the column set.

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
- Columns are added/removed inline; each column is a `{ key, label }` pair over the schema's properties.
