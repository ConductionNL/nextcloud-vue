# savedViewRouteName

The vue-router route name a page's saved views are registered under.

## Signature

```js
savedViewRouteName(pageId: string): string
```

`pageId` is the manifest page id.

## Usage

```js
import { savedViewRouteName } from '@conduction/nextcloud-vue'

savedViewRouteName('cases')  // 'cases__view'
```

The suffix comes from [`SAVED_VIEW_ROUTE_SUFFIX`](./saved-view-route-suffix.md).

Routes are addressed by name rather than by path everywhere in the library, because a name survives a page changing its `route`. [`savedViewRouteTarget`](./saved-view-route-target.md) builds the whole `{ name, params }` target and is what you usually want. Use this one when you register the route, or when you compare `$route.name` against it.
