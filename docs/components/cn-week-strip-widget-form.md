# CnWeekStripWidgetForm

Settings form of the `week-strip` ([`CnWeekStripWidget`](./cn-week-strip-widget.md)) dashboard widget. It drives `CnAddWidgetModal` and the cog style editor. It edits the source, the date field, what each item shows, the number of days and the empty text. Static `items` and the `lateWhen` rule are written in the manifest and pass through untouched.

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

`validate()` returns an error when the register, the schema or the date field is missing. A widget with static `items` and no source is valid as it is.
