---
sidebar_position: 14
---

# CnRowActions

Action menu for table rows and cards. Automatically switches to a dropdown menu when more than 3 actions are defined.

**Wraps**: NcActions, NcActionButton

![CnRowActions dropdown menu showing View, Edit, Copy, and Delete options](/img/screenshots/cn-row-actions.png)

![CnRowActions dropdown menu showing View, Edit, Copy, and Delete options](/img/screenshots/cn-row-actions.png)

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `actions` | Array | `[]` | Action definitions: `[\{ label, icon?, handler, disabled?, destructive? \}]` |
| `row` | Object | `null` | Row data passed to handlers |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `action` | `\{ action, row \}` | Action triggered |

## Usage

```vue
<CnRowActions
  :actions="[
    { label: 'Edit', icon: 'Pencil', handler: 'edit' },
    { label: 'Copy', icon: 'ContentCopy', handler: 'copy' },
    { label: 'Delete', icon: 'Delete', handler: 'delete', destructive: true },
  ]"
  :row="row"
  @action="onAction" />
```
