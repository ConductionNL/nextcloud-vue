# CnTasksWidgetForm

Config sub-form for a [`CnTasksWidget`](./cn-tasks-widget.md) (`tasks`) placement. Used by `CnAddWidgetModal` and the cog style editor.

Deliberately small: whose inbox it is stays the endpoint's decision, so there is no user, register or schema to pick. What IS a choice: the scope (assigned to me, pool, watched, everything), how many rows the cell holds, how often to refetch, an optional in-app route for row clicks, and what to say when the inbox is empty.

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
| `validate()` | `boolean` | Always `true`: every field has a working default, so this widget can never be added in a broken state. |
