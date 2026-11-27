# WIDGET_PLACEHOLDER_SHAPES

The closed set of shapes a dashboard widget can wait in while its content loads: `rows` (lists), `lines` (text), `block` (a field, table, chart or other single area), `tiles` (one square per tile), `counter` (a number) and `heading` (nothing: the title is the content). A new shape is a change to the widget-placeholder spec and to every server host that prints the markup.

## Import

```js
import { WIDGET_PLACEHOLDER_SHAPES } from '@conduction/nextcloud-vue'
```

See [`resolveWidgetPlaceholder`](./resolve-widget-placeholder.md) and [`CnWidgetPlaceholder`](../components/cn-widget-placeholder.md).
