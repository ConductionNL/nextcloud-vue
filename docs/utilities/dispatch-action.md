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
        type?: 'handler' | 'open-modal' | 'open-page' | 'navigate' | 'object-op' | 'export',
        // type-specific fields:
        handler?: string,           // type='handler'; type='export' — confirm handler name
        args?: any[],               // type='handler'
        target?: string,            // type='open-modal' | 'open-page' | 'navigate'
        props?: object,             // type='open-modal'
        op?: 'patch' | 'delete' | 'create',  // type='object-op'
        values?: object,            // type='object-op' — patch merge / create payload
        confirm?: boolean,          // type='object-op' — confirm-gating intent (host-consumed)
        entities?: { id, label }[], // type='export' — selectable entity types (optional)
        formats?: (string | { id, label })[],  // type='export' — offered formats (optional)
        description?: string,       // type='export' — pre-translated dialog description
    },
    context: {
        router?: VueRouter,         // required for 'open-page' + 'navigate'
        registry?: Record<string, { kind, component }>,  // required for 'open-modal'
        handlers?: Record<string, Function>,             // required for 'handler'
        openModal?: (key: string, props?: object) => void,  // required for 'open-modal'
        openExport?: (action: object) => void,  // required for 'export' (CnPageRenderer pre-binds it)
        objectStore?: ObjectStore,  // required for 'object-op' (useObjectStore shape)
        source?: { register, schema },  // required for 'object-op' — the widget's source
        row?: object,               // required for 'object-op' patch/delete (row-scoped)
    },
): void | Promise<object | boolean | null>  // object-op returns the store call's promise
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

### `object-op`

Declarative mutation of an OpenRegister object (ADR-049), dispatched via
the shared object store: `saveObject` for `op: 'patch'` (the `row` merged
with `values`) and `op: 'create'` (`values` as a new object), and
`deleteObject` for `op: 'delete'` — always against
`context.source.register` / `context.source.schema` (a matching
already-registered store type is reused; otherwise a
`<register>/<schema>` type is registered on the fly).

The manifest declares **intent only**: authorization-shaped fields on
the action (`role`, `allow`, …) are never consulted — OpenRegister RBAC
is the single authority, a forbidden mutation is rejected server-side,
and the store only mutates its caches on success, so a rejected write
surfaces (via the returned `null` / `false` and the store's
`errors[type]`) with **no local state change**.

`confirm` is consumed by the rendering host, not by the dispatcher:
`CnWidgetObjectTable` routes `delete` (always) and `patch`/`create`
(on `confirm: true`) through `CnConfirmDialog` *before* calling
`dispatchAction`.

```js
const result = await dispatchAction(
    { type: 'object-op', op: 'patch', values: { status: 'accepted' } },
    { objectStore: useObjectStore(), source: { register: 'pipelinq', schema: 'case' }, row },
)
if (result === null) { /* rejected — surface the store error, mutate nothing */ }
```

### `export`

Opens the shared export launcher (`CnMassExportDialog`) via
`context.openExport(action)` — `CnPageRenderer` pre-binds `openExport`
into the `cnDispatchAction` context and mounts the dialog, configured
from the action's `entities[]` (optional entity-type picker),
`formats[]` (bare ids like `"csv"` are lifted to `{ id, label }`;
omitted = the dialog's Excel/CSV defaults), and `description`.

On confirm, the dialog's payload (`{ format, entity? }`) routes to the
action's `handler` resolved against the **manifest actions map** (the
same registry `type: "handler"` actions use); the handler performs the
actual download (e.g. an app's ExportService) and its promise drives
the dialog's success/error result phase. A missing handler surfaces as
a dialog error — never a silent success.

```jsonc
{
  "id": "report-export",
  "label": "Download report",
  "type": "export",
  "description": "CSV / Excel / JSON reports for funders and stakeholders.",
  "entities": [
    { "id": "leads", "label": "Leads" },
    { "id": "requests", "label": "Requests" }
  ],
  "formats": ["excel", "csv", "json"],
  "handler": "exportReport"
}
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
