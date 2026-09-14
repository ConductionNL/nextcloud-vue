# buildManifestRoutes

Turns a manifest's `pages[]` into vue-router route records, including the extra records a split view needs.

Until now every app wrote this by hand:

```js
routes: manifest.pages.map((p) => ({ name: p.id, path: p.route, component: CnPageRenderer }))
```

That one-liner can only produce one route per page. A split view needs two: `/cases` and `/cases/split/:id` must mount the *same* index page, because a list that unmounts throws away the scroll position the split view exists to keep.

## Usage

```js
import { buildManifestRoutes, CnPageRenderer } from '@conduction/nextcloud-vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: buildManifestRoutes(manifest, {
    component: CnPageRenderer,
    props: { manifest, customComponents },
  }),
})
```

## Options

| Option | Type | Description |
|---|---|---|
| `component` | Component | What every route mounts. Normally `CnPageRenderer`. |
| `props` | Object \| Function \| Boolean | Passed straight through to vue-router. Omit it and the key is left off the record. |
| `decorate` | `(page, record) => record` | Called with each page and its record. Add a `beforeEnter`, extra `meta` or a per-page component without re-implementing the builder. A hook that returns nothing keeps the record. |

## What it emits

One record per page, named by `page.id` and pathed by `page.route`, plus one extra for every index page declaring `splitView.enabled`:

| | List route | Split route |
|---|---|---|
| name | `cases` | `cases__split` |
| path | `/cases` | `/cases/split/:id` |
| meta | `{ cnPageId: 'cases' }` | `{ cnPageId: 'cases', cnSplitOf: 'cases', cnSplitBreakpoint: 900 }` |

Every record carries `meta.cnPageId`. `CnPageRenderer` reads that before falling back to matching `$route.name === page.id`, so a route whose name is not a page id still resolves to its page instead of rendering a blank screen at a valid address.

The param is called `id` unless the page's own path already binds `id`, in which case it is `splitId`. Two params of one name in one path make vue-router keep the last and drop the first in silence, which reads as "the split opened the wrong record".

`tabInAddress` needs no record: the tab travels as the `_tab` query parameter on the detail page's existing route. The underscore keeps `resolveQueryFilters` from reading the tab as a filter and sending it to the API.

## Helpers

`buildManifestRoutes` is the only name on the barrel, because it is the only one most hosts need. The five helpers below are exported from the module itself, for a host that pushes to a split route by name or reads one back:

```js
import { splitRouteName } from '@conduction/nextcloud-vue/src/utils/buildManifestRoutes.js'
```

| Export | Description |
|---|---|
| `splitRouteName(pageId)` | The name a page's split route is registered under. |
| `splitRoutePath(route)` | The split path for a page's own path. |
| `pageHasSplitView(page)` | Whether a page declares a working split view. |
| `pageIdForRoute(route)` | The page id a route resolves to. `meta.cnPageId` first, the route name second. |
| `splitIdForRoute(route)` | The record a split route is showing, or `null` when it is not a split route. |

## Migrating

Replace the `pages.map()` one-liner. Nothing else changes: a manifest declaring no `splitView` produces exactly the records the hand-written version did, in the same order.

## Next

Declare the split view on the page: see [`CnIndexPage`](../components/cn-index-page.md#split-view).
