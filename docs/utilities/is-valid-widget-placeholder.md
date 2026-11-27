# isValidWidgetPlaceholder

Whether a `value` is a valid placeholder declaration: a shape name from [`WIDGET_PLACEHOLDER_SHAPES`](./widget-placeholder-shapes.md), or `{ shape, count }` with `count` an integer from 1 to 24. `registerDashboardWidget` uses it to refuse an invalid `placeholder` with a `TypeError`.

## Import

```js
import { isValidWidgetPlaceholder } from '@conduction/nextcloud-vue'
```

```js
isValidWidgetPlaceholder('counter')                     // true
isValidWidgetPlaceholder({ shape: 'rows', count: 25 })  // false
```

See [`normalizeWidgetPlaceholder`](./normalize-widget-placeholder.md).
