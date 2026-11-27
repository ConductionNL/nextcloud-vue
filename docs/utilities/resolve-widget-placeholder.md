# resolveWidgetPlaceholder

Resolves the placeholder shape a dashboard widget waits in while its content loads. It is the one place that knows the order, so every host draws the same shape for the same widget.

## Import

```js
import { resolveWidgetPlaceholder } from '@conduction/nextcloud-vue'
```

## Signature

```js
resolveWidgetPlaceholder(widgetDef, registryEntry, ncDescriptor) // → { shape, count? }
```

The first valid `placeholder` wins:

1. `widgetDef`: the manifest widget declaration (`widgetDef.placeholder`, schema 1.9.0);
2. `registryEntry`: the registry entry of the widget's type (`registerDashboardWidget(type, { placeholder })`);
3. `ncDescriptor`: the descriptor of a Nextcloud dashboard API widget, which a host fills from the PHP widget's `getPlaceholder()`;
4. otherwise `{ shape: 'rows' }`.

An invalid declaration at any step is skipped. Draw the result with [`CnWidgetPlaceholder`](../components/cn-widget-placeholder.md).

```js
resolveWidgetPlaceholder({ type: 'chart', placeholder: 'counter' }, getWidgetTypeEntry('chart')) // { shape: 'counter' }
resolveWidgetPlaceholder({ type: 'weather_status' }, undefined, { id: 'weather_status' })     // { shape: 'rows' }
```
