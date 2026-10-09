# CnNotepadWidgetForm

Config sub-form for the `notepad` widget: a title and a height. The note itself is never part of the placement; it lives in the reader's user preferences. A notepad needs no other configuration, so the form is always valid.

Part of the dashboard widget library. See [CnNotepadWidget](./cn-notepad-widget.md) and [the widget library overview](./cn-widget-grid.md).

## Reference

### Props

| Name | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `editingWidget` | `{content: object}` or `null` | | `null` | The placement being edited, or `null` in create mode. |
| `value` | `object` | | `\{ title: '', height: '' \}` | Initial content values when not editing. |

### Events

| Name | Payload | Description |
| --- | --- | --- |
| `update:content` | `object` | Emitted with the assembled content blob (`title`, `height`) on every field change. |
