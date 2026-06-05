# dispatchAction

`dispatchAction(action, context)` is the unified action dispatcher for
v2 manifest actions. It dispatches an action object against a runtime
context — every dispatch path is non-throwing; errors surface as
`console.warn` so a misconfigured action never crashes the host.

## Import

```js
import { dispatchAction } from '@conduction/nextcloud-vue'
```

## Signature

```ts
function dispatchAction(
    action: {
        type?: 'handler' | 'open-modal' | 'open-page' | 'navigate',
        // type-specific fields:
        handler?: string,           // type='handler'
        args?: any[],               // type='handler'
        target?: string,            // type='open-modal' | 'open-page' | 'navigate'
        props?: object,             // type='open-modal'
    },
    context: {
        router?: VueRouter,         // required for 'open-page' + 'navigate'
        registry?: Record<string, { kind, component }>,  // required for 'open-modal'
        handlers?: Record<string, Function>,             // required for 'handler'
        openModal?: (key: string, props?: object) => void,  // required for 'open-modal'
    },
): void
```

When `action.type` is missing it's treated as `"handler"` for v1
backward compatibility.

## Dispatch types

### `handler` (default)

Calls `context.handlers[action.handler](...action.args)`. Warns and
no-ops if the handler isn't registered.

```js
dispatchAction(
    { handler: 'createSource', args: [{ name: 'New' }] },
    { handlers: { createSource: (data) => { /* ... */ } } },
)
```

### `open-modal`

Resolves `context.registry[action.target]` and calls
`context.openModal(action.target, action.props)`. Warns if the
target is not registered as a `modal` kind.

```js
dispatchAction(
    { type: 'open-modal', target: 'edit-source', props: { id: '1' } },
    { registry: customComponents, openModal: cnOpenModal },
)
```

### `open-page` / `navigate`

Both push to `context.router`. `navigate` is the literal `router.push`;
`open-page` resolves the manifest page by id, then `router.push`es to
its route name. Warns and no-ops if the router or target is missing.

```js
dispatchAction(
    { type: 'navigate', target: '/sources' },
    { router: $router },
)
```

## When you'd call it directly

Usually you don't — `CnPageRenderer` calls `dispatchAction` for you
when a manifest-declared action fires (action button click, table
row action, etc.) and injects the runtime context. Direct calls make
sense in custom widget code that wants to delegate an action through
the manifest action vocabulary without hand-rolling the dispatch
switch.

## Spec

- REQ-MVR-011 (manifest-v2-renderer) — unified actions dispatcher
- ADR-036 Decision 7 — action dispatch vocabulary
