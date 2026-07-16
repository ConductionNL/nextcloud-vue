# createObjectSearchSource

The "objects" source adapter for [`CnCommandPalette`](../components/cn-command-palette.md): builds an `async (query) => resultItems[]` function for the palette's `objectSearch` prop by fanning a query out to `store.fetchCollection(type, { _search, _limit })` for every configured type — the SAME call `CnIndexPage` / `CnSearchPage` consumers already wire up — in parallel, discarding stale responses.

```js
import { useObjectStore, createObjectSearchSource } from '@conduction/nextcloud-vue'

const objectSearch = createObjectSearchSource({
  store: useObjectStore(),
  types: ['myapp-invoice', 'myapp-customer'],
  section: 'Objects',
  resolveResult: (obj, type) => ({
    title: obj.title || obj.name,
    subtitle: type,
    route: { path: `/${type}/${obj.id}` },
  }),
  router: myRouter,
})
```

```vue
<CnCommandPalette :object-search="objectSearch" ... />
```

Or, via `CnAppRoot`'s zero-config `commandPalette` prop:

```vue
<CnAppRoot :command-palette="{ objectSearch }" ... />
```

## Signature

```js
createObjectSearchSource(config)
```

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `config.store` | `object` | — | **Required.** A `useObjectStore()` instance (or anything exposing `fetchCollection(type, params)`). |
| `config.types` | `string[]` | — | **Required.** Registered type slugs to search (as passed to `store.registerObjectType` / `fetchCollection`). |
| `config.section` | `string` | `'Objects'` | Section label the palette groups these results under. |
| `config.limit` | `number` | `6` | Max results requested **per type** (not total). |
| `config.minQueryLength` | `number` | `2` | Below this query length, `search()` resolves to `[]` without calling the store — avoids a network round-trip per keystroke on a 1-character query. |
| `config.resolveResult` | `?Function` | title-ish field sniffing | `(obj, type) => { title, subtitle?, keywords?, route?, run? }`. Supply this to wire real navigation. |
| `config.router` | `?object` | `null` | A vue-router instance. When `resolveResult` returns `route` (and not `run`), the item's `run()` calls `router.push(route)`. Omit if every `resolveResult` returns its own `run`. |

Returns `{ id: 'objects', section, search }` — the source descriptor for `CnCommandPalette`'s `objectSearch` prop (`search` is what you actually pass).

## Cancellation

"Cancellable" here means **stale-result discarding**, not `AbortController` network cancellation — `fetchCollection` doesn't accept a signal. A monotonic call token ensures a slow, superseded search's response is thrown away instead of overwriting a newer query's results: the in-flight network request may finish late, but its answer never reaches the UI. This is what "never blocks the palette" means in practice — navigation and action results (computed synchronously, client-side) always render immediately; objects results simply pop in once resolved, or don't, if superseded.

## Wiring navigation with a manifest-driven detail page

If your app follows the conventional manifest `type: 'detail'` page pattern (`config: { register, schema }`, a single `:id` route segment), `resolveManifestDetailRoute` is a ready-made building block — imported by subpath (not part of the barrel export, same precedent as the NL-government icon sets):

```js
import { createObjectSearchSource, resolveManifestDetailRoute } from '@conduction/nextcloud-vue/src/utils/commandPaletteObjectSource.js'

const objectSearch = createObjectSearchSource({
  store: useObjectStore(),
  types: ['myapp-invoice'],
  router: myRouter,
  resolveResult: (obj) => ({
    title: obj.title,
    route: resolveManifestDetailRoute(manifest.pages, { register: 'myapp', schema: 'invoice', id: obj.id }),
  }),
})
```

## Default `resolveResult`

When omitted, results are titled from the first of `obj.title`, `obj.name`, `obj.label`, or `obj['@self'].name` (falling back to the bare id) and given no navigation (`run()` warns in dev and no-ops) — supply `resolveResult` (and/or `router`) to make results actually navigable.
