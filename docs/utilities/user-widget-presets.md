# userWidgetPresets

The pre-configured widgets a page offers a user, read from `config.userWidgets[]`.

## Signature

```js
userWidgetPresets(config: object | null): Array<{ id, kind, label, widget }>
```

## Why presets exist beside the type list

The registry types a user may add are deliberately few. The two lists a user actually wants on their dashboard — one of their saved views, and their own tasks — are both `object-list` widgets that need a query the **app** knows and the user does not. A preset is that widget, already configured, offered under a name a user recognises.

## Usage

```json
{
  "id": "Dashboard",
  "type": "dashboard",
  "config": {
    "userLayout": true,
    "userWidgets": [
      { "id": "my-views", "kind": "saved-view", "label": "One of my saved views", "widget": { "type": "object-list" } },
      { "id": "my-tasks", "kind": "tasks", "label": "My tasks", "widget": { "type": "object-list", "filter": { "assignee": "@me" } } }
    ]
  }
}
```

```js
import { userWidgetPresets } from '@conduction/nextcloud-vue'

userWidgetPresets(page.config)
// [{ id: 'my-views', kind: 'saved-view', label: 'One of my saved views', widget: { … } }, …]
```

## What it drops

An entry with no `id` or no `kind` is dropped rather than offered: a preset nobody can identify cannot be added, and one with no kind has nothing to render. An entry with no `label` is kept and falls back to its `id`, so it is still clickable with intent rather than a blank row.

The `widget` definition is **copied**, so adding the same preset twice gives two widgets rather than two references to one.

## See also

- [`listUserAddableWidgetTypes`](./list-user-addable-widget-types.md) — the types a user may add
- [`dashboardLayoutsPlugin`](../store/plugins/dashboard-layouts.md) — where the resulting arrangement is stored
