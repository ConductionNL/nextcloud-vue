# CnWidgetEditCog

The single per-widget edit affordance for editable dashboards — a white, rounded cog button that opens a small action menu with **Edit** + **Delete**. Designed to be overlaid (absolute, top-right) by the host over any widget surface so every dashboard widget shares one consistent edit control. Emits raw `edit` / `remove`; the host decides what they act on. Labels are props so the consumer supplies translated strings.

```vue
<CnWidgetEditCog
  :edit-label="t('myapp', 'Edit widget')"
  :delete-label="t('myapp', 'Delete widget')"
  @edit="onEdit(placement)"
  @remove="onRemove(placement.id)" />
```

## Props

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `menuLabel` | `String` | `'Widget menu'` | Accessible name for the cog trigger / menu. |
| `editLabel` | `String` | `'Edit widget'` | Label for the Edit action item. |
| `deleteLabel` | `String` | `'Delete widget'` | Label for the Delete action item. |

## Events

| Name | Description |
|------|-------------|
| `edit` | Emitted when the Edit action is clicked. |
| `remove` | Emitted when the Delete action is clicked. |
