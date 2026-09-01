# CnFlowRunsWidgetForm

Config sub-form for a [`CnFlowRunsWidget`](./cn-flow-runs-widget.md) (`flow-runs`) placement. Used by `CnAddWidgetModal` and the cog style editor.

Deliberately small: the widget has no register / schema / filter to pick, because "which flow runs" is not a choice — it is every live run the viewer's organisation owns, resolved server-side. What IS a choice is how many rows the cell can hold, how often to refetch, where a row click goes, an optional run route for deep links, an optional subject object to scope to (a uuid, or `@objectId` on a detail page), and what to say when nothing is running.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `editingWidget` | `object` | `null` | The placement being edited; pre-fills from `editingWidget.content`. |
| `value` | `object` | registry defaults | Initial content values when not editing. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:content` | `object` | The assembled content blob, emitted on every field change. |

## Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `validate()` | `boolean` | Always `true` — every field has a working default, so this widget can never be added in a broken state. |
