# RegistryKindError

`RegistryKindError` is thrown by `CnAppRoot` when a registry entry
declares an unrecognised `kind` value. It carries the offending key and
the bad kind so consumers can surface a friendly message.

## Import

```js
import { RegistryKindError } from '@conduction/nextcloud-vue'
```

## Shape

```ts
class RegistryKindError extends Error {
    name: 'RegistryKindError'
    registryKey: string    // the key in the registry that had the bad kind
    unknownKind: string    // the unrecognised kind value
}
```

## When is it thrown

`CnAppRoot` walks the v2 `registry` prop once at mount and validates
each entry's `kind`. Recognised kinds, grouped by what the host does
with the entry:

| Kind | Entry carries | Mounted where |
|------|---------------|---------------|
| `widget` | `component` + `defaultSize`, `minSize`, `maxSize`, `allowedSlots`, `propsSchema` | A page's widget grid, or a tabs-widget child resolved by type |
| `modal` | `component` + `propsSchema` | Opened by `cnOpenModal` / an `open-modal` action |
| `page` | `component` | A `type: "custom"` page's `component`, a `slots.main`, a `sidebarComponent`, a sidebar tab |
| `header` / `actions` / `tab` / `section` | `component` | A named page slot (`headerComponent` / `actionsComponent` sugar, a sidebar tab, a body section) |
| `form-field` / `cell-renderer` | `component` + `appliesTo` | A schema property's input, a table cell |
| `handler` | a function on `.handler` or `.fn` | Nowhere — resolved BY NAME for `actions[]` / `bulkActions[]` / `headerActions[]` |
| `create-override` | a function on `.handler` or `.fn` | Nowhere — resolved by name for `config.createOverride` |

Only `widget`, `modal`, `form-field` and `cell-renderer` carry required
metadata; a missing field there is a `console.warn`, not this error.

**Which kind to pick for a component is decided by WHERE it mounts, not by
this table.** Only three positions demand a specific kind, all of them
`page`: a `type: "custom"` page's `component`, its `slots.main` when it
declares no `component`, and its `sidebarComponent`. Every other lookup — a
named page slot, `headerComponent` / `actionsComponent`, a sidebar tab, a
`cardComponent` / `listComponent` — takes ANY kind that carries a
`component`, which is why a `kind: 'page'` entry renders happily as a
sidebar tab. Use `tab` / `section` / `header` / `actions` to say what an
entry is for; nothing rejects the others.

An entry with any other `kind` (typo, dropped field, or kind from a
newer library version the host hasn't been upgraded to) raises this
error during mount, surfacing the misconfiguration immediately
rather than failing later inside `CnPageRenderer` slot dispatch with
an opaque "no component found" message.

⚠️ The throw is **uncaught inside `mounted()`**, so it also stops the two
calls after it — the `customComponents` deprecation check and the menu-count
hydration. A single bad kind therefore leaves every `count: "auto"` nav badge
empty, which looks like a data problem rather than a registry one.

## Example

```js
try {
    new Vue({ render: h => h(App, {
        props: { registry: { foo: { kind: 'widgit', component: Foo } } },
    }) }).$mount('#content')
} catch (err) {
    if (err instanceof RegistryKindError) {
        console.error(
            `Registry entry "${err.registryKey}" uses unknown kind "${err.unknownKind}".`,
        )
    } else {
        throw err
    }
}
```

## Spec

- REQ-MVR-002 — manifest-v2-renderer registry validation
