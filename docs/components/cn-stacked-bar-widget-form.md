# CnStackedBarWidgetForm

Settings form of the `stacked-bar` ([`CnStackedBarWidget`](./cn-stacked-bar-widget.md)) dashboard widget. It drives `CnAddWidgetModal` and the cog style editor. It edits the source, the field the records are grouped by, the order of the segments and the empty text. Static `segments` and the `labels` map are written in the manifest and pass through untouched.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `editingWidget` | `object\|null` | `null` | The placement being edited (pre-fills from `editingWidget.content`), or `null` in create mode. |
| `value` | `object` | `{}` | Initial content values when not editing. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:content` | `object` | The assembled content blob, emitted on every change. |

## Validation

`validate()` returns an error when the register, the schema or the group field is missing. A widget with static `segments` and no source is valid as it is.
