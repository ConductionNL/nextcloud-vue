---
sidebar_position: 14
---

# CnRowActions

Per-row action menu for tables and cards. Renders as a `⋯` button that opens a dropdown with the configured actions. Automatically marks destructive actions (e.g., Delete) with a danger style.

**Wraps**: NcActions, NcActionButton

![CnRowActions dropdown showing View, Edit, Copy, and Delete options for the focused row](/img/screenshots/cn-row-actions.png)

## Anatomy

```
                      +----------------+
                      |  👁 View       |  ← navigate to detail
                      |  ✏ Edit        |  ← open edit form
[ ⋯ ]  ──opens──▶    |  ⊕ Copy        |  ← duplicate the object
                      |  ─────────────  |  ← divider before destructive actions
                      |  🗑 Delete     |  ← destructive: shown in red
                      +----------------+
    ↑
trigger button (last cell of every row)
```

| Region | Description |
|--------|-------------|
| **Trigger button** | `⋯` icon button placed in the last column of the row; always visible on hover |
| **Action items** | Each action renders with an optional icon and label |
| **Divider** | Automatically inserted before the first action marked `destructive: true` |
| **Destructive actions** | Shown in the Nextcloud danger color to signal irreversible operations |

## Usage

```vue
<CnRowActions
  :actions="[
    { label: 'View',   icon: 'Eye',         handler: 'view' },
    { label: 'Edit',   icon: 'Pencil',       handler: 'edit' },
    { label: 'Copy',   icon: 'ContentCopy',  handler: 'copy' },
    { label: 'Delete', icon: 'Delete',       handler: 'delete', destructive: true },
  ]"
  :row="row"
  @action="onAction" />
```

Listen for the `action` event to handle the selected action:

```js
function onAction({ action, row }) {
  if (action.handler === 'edit') openEditDialog(row)
  if (action.handler === 'delete') confirmDelete(row)
}
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `actions` | Array | `[]` | Array of action definition objects (see Action definition below) |
| `row` | Object | `null` | The row data object — passed as-is in the `action` event payload so handlers can access it |

#### Action definition

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `label` | String | ✓ | Display text for the action item |
| `icon` | String | — | MDI icon name (e.g., `'Pencil'`) resolved via the CnIcon registry |
| `handler` | String | ✓ | Identifier string emitted in the `action` event so the parent can switch on it |
| `disabled` | Boolean | — | When `true`, the action item is rendered but not clickable |
| `destructive` | Boolean | — | When `true`, renders the action in danger color and adds a divider above it |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `action` | `{ action, row }` | Emitted when an action item is clicked; `action` is the full action definition object, `row` is the value of the `row` prop |
