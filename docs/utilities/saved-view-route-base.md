# savedViewRouteBase

The path segment a page puts between its own route and a view id.

## Signature

```js
savedViewRouteBase(page: object): string
```

`page` is a manifest page entry.

## Usage

```js
import { savedViewRouteBase } from '@conduction/nextcloud-vue'

savedViewRouteBase({ savedViewPlaces: { routeBase: 'lijsten' } })   // 'lijsten'
savedViewRouteBase({ savedViewPlaces: { routeBase: '/lijsten/' } }) // 'lijsten'
savedViewRouteBase({ savedViewPlaces: { routeBase: '  ' } })        // 'views'
savedViewRouteBase({})                                              // 'views'
```

Slashes at either end are stripped, so a manifest that writes `/lijsten/` and one that writes `lijsten` build the same path. A blank declaration falls back to [`DEFAULT_SAVED_VIEW_ROUTE_BASE`](./default-saved-view-route-base.md) rather than producing `/cases//42`, which vue-router matches as a different path than the one every link uses.

Hand the result to [`savedViewRoutePath`](./saved-view-route-path.md).
