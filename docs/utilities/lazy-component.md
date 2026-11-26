# lazyComponent

Wraps a component loader in a component that fetches its real definition on first render. The widget registry and the other places that keep component references in data use it, so a heavy component (charts, the code editor, dialogs) is only downloaded when it is first shown.

## Import

```js
import { lazyComponent } from '@conduction/nextcloud-vue'
```

## Signature

```ts
function lazyComponent(
    loader: () => Promise<object>,
    name?: string,
): object
```

| Name | Type | Description |
|------|------|-------------|
| `loader` | `() => Promise<object>` | Returns the module (its `default` is used) or the component itself, typically `() => import('./MyChart.vue')`. |
| `name` | `string` | Name of the loaded component, default `'Component'`. The wrapper is called `Lazy<name>` and the name appears in the error logged when loading fails. |

The wrapper renders nothing until the module arrives, then renders the loaded component. It takes no attributes of its own: every attribute, listener and slot is passed through, and a template ref on the wrapper reaches the loaded component's public instance. A failed load is logged and retried on the next render.

Unlike `defineAsyncComponent`, the resolved definition is held in a ref, so a computed that inspects it through [`resolveLazyComponent`](./resolve-lazy-component.md) (its declared props, for example) recomputes once it has loaded. Use [`loadLazyComponent`](./load-lazy-component.md) to fetch it ahead of the first render.

## Usage

```js
import { lazyComponent } from '@conduction/nextcloud-vue'

const MyChartWidget = lazyComponent(() => import('./MyChartWidget.vue'), 'MyChartWidget')

registerWidget('my-chart', MyChartWidget)
```
