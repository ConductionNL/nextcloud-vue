# resolveLazyComponent

Returns the definition behind a [`lazyComponent`](./lazy-component.md) wrapper once it has loaded, `null` while it is still loading, and any other component unchanged. Reading it inside a computed makes that computed follow the load, so code that inspects a component's declared props keeps working for lazily loaded components.

## Import

```js
import { resolveLazyComponent } from '@conduction/nextcloud-vue'
```

## Signature

```ts
function resolveLazyComponent(component: object | null): object | null
```

| Name | Type | Description |
|------|------|-------------|
| `component` | `object \| null` | A component definition, lazy wrapper or not. |

## Usage

```js
computed: {
    acceptsSurface() {
        const definition = resolveLazyComponent(this.widgetComponent)
        return Boolean(definition && definition.props && 'surface' in definition.props)
    },
},
```
