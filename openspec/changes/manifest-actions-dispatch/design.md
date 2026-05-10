# Design: Manifest `actions[].handler` dispatch

## Reuse analysis

- The `customComponents` registry already exists on `CnAppRoot` / `CnPageRenderer` (used today for `type: "custom"` pages, `headerComponent`, `actionsComponent`, `slots`). Action handlers ride on the same registry — no new injection plumbing.
- `CnRowActions` already supports a `handler` function on its action prop shape (line 122-127 of `CnRowActions.vue`). The runtime path works; only the manifest path is missing. This change wires the manifest path to the existing runtime contract.
- `validateManifest.js#validateActionsArray()` already validates `id` + `label`; extending it for `handler` is a one-string-check addition.
- The schema's `action` $def is the single source of truth for the manifest-level action shape; adding `handler` there propagates everywhere via the existing `$ref` from `pages[].config.actions[]`.

## API decision: handler-as-registry-name (NOT handler-as-event-only)

Three options were on the table:

1. **Event-only** — declare actions in the manifest, listen for `@action` at the page level, switch on `actionId` to call the right modal. **Rejected** because every consumer writes the same dispatch boilerplate and the manifest stays half-declarative (the action exists but its behaviour is wired in JS).
2. **Handler-as-inline-function** — embed a JS arrow function in the manifest. **Rejected** because the manifest is JSON; functions break static validation, JSON schema validation, and the App Builder UI's "render the manifest" promise.
3. **Handler-as-registry-name** — the manifest declares a string; the consumer's `customComponents` registry maps the string to a function. **Chosen** because it keeps the manifest static-validatable, mirrors how `component` / `headerComponent` / `slots` already resolve, and gives the consumer a single registration point.

Three reserved keywords (`navigate`, `emit`, `none`) cover the cases where a registry function would be overkill (just route, just bubble, just block) and the schema admits all three by pattern.

## Resolution pseudocode

In `CnIndexPage.vue`:

```js
// New computed: derive a handler invocation function for any
// manifest-declared action, falling back to the existing
// runtime-only handler (when actions[].handler is itself a
// function passed in as a prop).
resolveHandler(action) {
  if (typeof action.handler === 'function') {
    // Runtime / programmatic path — already worked, kept for back-compat.
    return action.handler
  }
  if (typeof action.handler !== 'string' || action.handler.length === 0) {
    return null
  }
  if (action.handler === 'navigate') {
    return (row) => this.$router.push({
      name: action.route,
      params: { id: row[this.rowKey] },
    })
  }
  if (action.handler === 'emit' || action.handler === 'none') {
    return null  // page emits @action regardless; 'none' disables in onAction
  }
  const fn = this.effectiveCustomComponents[action.handler]
  if (typeof fn === 'function') {
    return (row) => fn({ actionId: action.id, item: row })
  }
  if (fn !== undefined) {
    console.warn(
      `[CnIndexPage] action.handler "${action.handler}" resolved to a non-function in customComponents — components belong to slot overrides; falling back to @action emit.`,
    )
  }
  return null
},
```

Then in `CnRowActions.onAction` (or in the action's `handler` field once `mergedActions` flows in), the resolved function is wired before render. The page's `@action` event still fires for any external listeners.

The same pattern lives in `CnDetailPage.vue` for its row-actions (when a detail page has child-row actions) and primary-action button.

## Schema change

Inside `action` $def of `app-manifest.schema.json`:

```jsonc
{
  "type": "object",
  "required": ["id", "label"],
  "additionalProperties": false,
  "properties": {
    /* … existing fields … */
    "handler": {
      "type": "string",
      "description": "Optional dispatch target. Either (a) one of the reserved keywords `\"navigate\"` / `\"emit\"` / `\"none\"`, or (b) a registry name resolving to a function in the customComponents map passed to CnAppRoot. When the registry name resolves to a function, it is called with `{ actionId, item }` on row-action click. When unset (the default), the action only emits `@action` and the page-level listener decides the side-effect.",
      "pattern": "^(navigate|emit|none|[A-Za-z][A-Za-z0-9_]*)$"
    },
    "route": {
      "type": "string",
      "description": "Vue-router route name dispatched when `handler === \"navigate\"`. Required for that keyword; ignored otherwise."
    }
  }
}
```

The `pattern` excludes spaces / dots / hyphens to keep the registry-name discipline aligned with JS identifier conventions; it is intentionally NOT a closed enum so consumer registries can grow organically.

## Backward compatibility

- v1.2 manifests (no `actions[].handler`) keep validating; they take the `@action`-only path identical to today.
- v1.2 consumers wiring their own `@action` listener keep working — handlers fire FIRST, then the event bubbles.
- The `customComponents` registry is unchanged in shape; consumers can mix function entries (handlers) with component entries (slot overrides). The lookup site (`resolveHandler` vs `resolveRegistryName`) disambiguates.
- The schema bumps from 1.2.0 to 1.3.0 (additive change). The canonical schema URL is unchanged; the schema's `version` field carries the bump.

## Open design questions

1. **Should the lib auto-refresh the index after a handler returns?** No for v1 — handlers can call `store.refresh()` themselves, and not every handler needs a refresh (e.g. opening a side-panel doesn't change the list). A v2 `handler.refreshOnComplete: boolean` field is a follow-up if the pattern proliferates.
2. **Should `action.handler` accept multiple targets (`["modal:create", "navigate"]`)?** No — one handler per action. Multi-step flows live in the handler function itself.
3. **What about mass-actions?** Same shape. Mass actions today use `CnActionsBar` (separate from row actions). A follow-up change extends mass-action items with the same `handler` field; out of scope for this change because the load-bearing pressure is row actions.
4. **Should the registry warn on a missing handler name?** Currently no — we silently fall back to `@action` only, because that's the back-compat path. A debug-mode warning could land later; for v1 we keep the console quiet.
