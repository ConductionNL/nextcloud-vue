# normalizeWidgetPlaceholder

Normalises a placeholder declaration to `{ shape, count? }`, or returns `null` when the `value` is not a valid one. A declaration is a shape name from [`WIDGET_PLACEHOLDER_SHAPES`](./widget-placeholder-shapes.md) or `{ shape, count }` with `count` an integer within [`WIDGET_PLACEHOLDER_COUNT`](./widget-placeholder-count.md).

## Import

```js
import { normalizeWidgetPlaceholder } from '@conduction/nextcloud-vue'
```

```js
normalizeWidgetPlaceholder('rows')                     // { shape: 'rows' }
normalizeWidgetPlaceholder({ shape: 'rows', count: 5 }) // { shape: 'rows', count: 5 }
normalizeWidgetPlaceholder('spinner')                  // null
```

See [`resolveWidgetPlaceholder`](./resolve-widget-placeholder.md).
