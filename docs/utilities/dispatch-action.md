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
        type?: 'handler' | 'open-modal' | 'open-page' | 'navigate' | 'object-op'
             | 'export' | 'open-form' | 'refresh' | 'api-call' | 'toggle',
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
        url?: string,               // type='api-call' — app endpoint (token-interpolated, @objectId or {objectId})
        method?: 'POST' | 'PUT',    // type='api-call' — default POST
        payload?: object,           // type='api-call' — JSON body, DEEP @-token resolution (preferred over params)
        params?: object,            // type='api-call' — legacy JSON body, shallow (1-level) @-token grammar
        download?: boolean,         // type='api-call' — request a blob response + trigger a file download (default false)
        filename?: string,          // type='api-call' download only — fallback filename (token-interpolated)
        successMessage?: string,    // type='api-call' — success toast text
        errorMessage?: string,      // type='api-call' — error toast text
        refresh?: boolean,          // type='api-call' — bump cn:page:refresh (default true; default FALSE when download:true)
    },
    context: {
        router?: VueRouter,         // required for 'open-page' + 'navigate'
        registry?: Record<string, { kind, component }>,  // required for 'open-modal'
        handlers?: Record<string, Function>,             // required for 'handler'
        openModal?: (key: string, props?: object) => void,  // required for 'open-modal'
        openExport?: (action: object) => void,  // required for 'export' (CnPageRenderer pre-binds it)
        openForm?: (action: object) => void,    // required for 'open-form' (the header-actions surface provides it)
        objectStore?: ObjectStore,  // required for 'object-op' (useObjectStore shape)
        source?: { register, schema },  // required for 'object-op' — the widget's source
        row?: object,               // required for 'object-op' patch/delete (row-scoped)
        tokenCtx?: object,          // 'api-call' — { objectId?, object?, workspace?, config? } for url/params tokens
    },
): void | Promise<object | boolean | null>  // object-op / api-call return a promise
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

### `open-form` (Wave 3, #91)

Opens the schema-driven create dialog via `context.openForm(action)` —
the header-actions surface ([`CnActionButtons`](../components/cn-action-buttons.md))
provides `openForm` and mounts a `CnAdvancedFormDialog` for the action's
`schema`, mirroring how `export` delegates to `CnMassExportDialog`. On
save the surface optionally navigates to the action's `onSuccessRoute`.

```jsonc
{ "id": "new-lead", "label": "New lead", "type": "open-form", "schema": "lead", "onSuccessRoute": "Leads" }
```

**`onSuccessRoute` deep-linking (#91).** On a successful save the surface
navigates via `buildOnSuccessRoute(onSuccessRoute, saved)`, which merges the
saved object's id (`saved.id` → `saved.uuid` → `saved['@self'].id`) into the
route params so the navigation can land on the created object's detail page.
`onSuccessRoute` is either:

- a **string** route NAME → `{ name, params: { id } }`. A route with no `:id`
  segment simply ignores the extra param, so a bare name keeps working
  unchanged (backward compatible).
- an **object** `{ name, paramField?, objectParam? }` → the id lands under
  `paramField` (default `id`), and — when `objectParam` is set — the whole
  saved object is passed under that param key too (so a `props: true` detail
  route renders the record without a refetch).

```jsonc
{
  "id": "new-lead", "label": "New lead", "type": "open-form", "schema": "lead",
  "onSuccessRoute": { "name": "LeadDetail", "paramField": "leadId" }
}
```

### `refresh` (Wave 3, #91)

Emits the page-level `cn:page:refresh` event-bus signal — every
endpoint-bound / bus-subscribed widget on the page force-refetches past
its short-TTL cache (the same signal the page overflow menu's Refresh
item broadcasts). No context is required.

```jsonc
{ "id": "refresh", "label": "Refresh", "type": "refresh" }
```

### `api-call` (Wave 3, #91)

POST/PUT a configured app endpoint, toast the outcome via
`@nextcloud/dialogs` (`showSuccess` / `showError`), then — unless
`refresh: false` (or, for a `download` call, unless `refresh: true`) —
bump `cn:page:refresh`. The `url` interpolates `@objectId` /
`@object.<field>` / `@workspace.<key>` / `@config.<key>` tokens, as well
as the literal `{objectId}` brace placeholder. Returns a promise of
`{ ok, data?, error? }`. `confirm` gating is the rendering surface's job
(object-op precedent) — the dispatcher runs after any confirmation.

**Request body — `payload` vs `params`.** `payload` is the preferred
field: its values resolve the SAME `@`-token grammar (`@me`, `@today±Nd`,
`@objectId`, `@object.<field>`, `@workspace.<key>?`/`@config.<key>?`)
**recursively at any nesting depth** — objects, arrays, and arrays of
objects all resolve, so a body like

```jsonc
{ "dataRefs": [{ "register": "crm", "schema": "lead", "id": "@objectId" }] }
```

resolves the nested `@objectId` correctly. The legacy `params` field
still works unchanged for back-compat, but only resolves tokens ONE
level deep (the flat filter-map shape) — prefer `payload` for anything
with nested objects/arrays. Either way, a required (non-`?`) token left
unresolved anywhere in the body **blocks the call** (error toast) rather
than sending the literal token string to the server. When both are set,
`payload` wins.

**`download: true`** requests the response as a binary blob
(`responseType: 'blob'`) and triggers a browser file download instead of
treating the body as JSON. The filename comes from the response's
`Content-Disposition` header, else the token-interpolated `filename`,
else `'download.pdf'`. The success toast still shows; unlike a normal
`api-call`, the page does **not** auto-refresh afterwards unless
`refresh: true` is set explicitly.

```jsonc
{
  "id": "approve",
  "label": "Approve run",
  "type": "api-call",
  "url": "/apps/shillinq/api/payment-runs/@objectId/approve",
  "confirm": true,
  "successMessage": "Payment run approved",
  "visibleWhen": { "field": "state", "op": "eq", "value": "pending" }
}
```

Generate-and-download a DocuDesk PDF for the current detail-page object:

```jsonc
{
  "id": "generate-pdf",
  "label": "Generate PDF",
  "type": "api-call",
  "url": "/apps/docudesk/api/documents/generate",
  "method": "POST",
  "payload": {
    "template": "invoice",
    "dataRefs": [{ "register": "crm", "schema": "lead", "id": "@objectId" }]
  },
  "download": true,
  "filename": "invoice-@objectId.pdf",
  "successMessage": "Document generated"
}
```

### `toggle` (Wave 3, #91) — not dispatched

A `toggle` is a **stateful two-way control** (GET state on mount, write
on click) rendered by the header-actions surface, not a one-shot action —
`dispatchAction` warns and no-ops on it. See
[`CnActionButtons`](../components/cn-action-buttons.md) for the config.

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
