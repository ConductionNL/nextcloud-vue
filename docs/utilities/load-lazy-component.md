# loadLazyComponent

Loads the definition behind a [`lazyComponent`](./lazy-component.md) wrapper ahead of its first render, for example to prefetch a dialog when the pointer enters the button that opens it. For any other value it resolves to the component itself (or `null`).

## Import

```js
import { loadLazyComponent } from '@conduction/nextcloud-vue'
```

## Signature

```ts
function loadLazyComponent(component: object | null): Promise<object | null>
```

| Name | Type | Description |
|------|------|-------------|
| `component` | `object \| null` | A component definition, lazy wrapper or not. |

The promise resolves to the loaded definition, or to `null` when loading failed (the failure is logged and the next call tries again).

## Usage

```js
await loadLazyComponent(registry.get('chart'))
```
