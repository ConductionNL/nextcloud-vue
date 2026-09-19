# savedViewRoutePath

The path pattern for a page's saved-view route.

## Signature

```js
savedViewRoutePath(route: string, routeBase?: string): string
```

`route` is the page's own path pattern. `routeBase` is the segment between the page and the view id, `views` by default.

## Usage

```js
import { savedViewRoutePath } from '@conduction/nextcloud-vue'

savedViewRoutePath('/cases')                        // '/cases/views/:viewId'
savedViewRoutePath('/cases/', 'lijsten')            // '/cases/lijsten/:viewId'
savedViewRoutePath('/reports/:viewId')              // '/reports/:viewId/views/:savedViewId'
```

## Why the param can change its name

The param is `viewId`, unless the page's own path already binds that name. Then it is `savedViewId`.

Two params of one name in one path make vue-router keep the last and drop the first without a word. On screen that reads as "the wrong view opened", and it is very hard to trace back to the manifest. [`viewIdForRoute`](./view-id-for-route.md) reads either name, so callers never have to know which one this page got.

Register the result, then build links with [`savedViewRouteTarget`](./saved-view-route-target.md).
