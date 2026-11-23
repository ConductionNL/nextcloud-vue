# mergeUserLayout

Merges a user's stored dashboard record over the layout the manifest ships. Pure: the rule the per-user dashboard turns on, exercisable without mounting a grid.

## Signature

```js
mergeUserLayout(manifestLayout: Array<object>, record: object | Array<object> | null): Array<object>
```

## The rule, in the order it is applied

1. **The manifest layout is the base.** Every widget it declares is present and every widget it does not declare is absent, whatever the record says.
2. A widget **with** a stored entry takes that entry's geometry.
3. A widget **without** a stored entry keeps its manifest position, so a page that gains a widget shows it rather than hiding it until the user next edits.
4. The user's own **order** is kept for the widgets they arranged, and widgets the admin added since are appended after them.

## Usage

```js
import { mergeUserLayout } from '@conduction/nextcloud-vue'

const manifest = [
  { id: 'kpis', widgetId: 'kpis', gridX: 0, gridY: 0, gridWidth: 3, gridHeight: 2 },
  { id: 'tasks', widgetId: 'tasks', gridX: 3, gridY: 0, gridWidth: 3, gridHeight: 2 },
]

mergeUserLayout(manifest, { items: [{ widgetId: 'kpis', gridX: 6 }] })
// kpis at gridX 6; tasks still at its manifest gridX 3
```

## What it will not do

It never lets a record overwrite anything but geometry. A stored `title` or `styleConfig` is ignored, because those belong to the manifest and an admin who changes one must see the change take effect.

```js
mergeUserLayout(
  [{ widgetId: 'kpis', gridX: 0, title: 'Numbers' }],
  { items: [{ widgetId: 'kpis', gridX: 6, title: 'Mine' }] },
)
// → gridX 6, title 'Numbers'
```

And it never adds a widget back:

```js
mergeUserLayout(
  [{ widgetId: 'kpis', gridX: 0 }],
  { items: [{ widgetId: 'kpis', gridX: 6 }, { widgetId: 'old', gridX: 0 }] },
)
// → only kpis; `old` is gone because the manifest no longer declares it
```

## See also

- [`dashboardLayoutsPlugin`](../store/plugins/dashboard-layouts.md) — reads and writes the record
