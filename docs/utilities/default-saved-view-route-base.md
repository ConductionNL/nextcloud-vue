# DEFAULT_SAVED_VIEW_ROUTE_BASE

The path segment between a page's own route and a view id, when the page names none of its own.

```js
import { DEFAULT_SAVED_VIEW_ROUTE_BASE } from '@conduction/nextcloud-vue'
```

Value: `'views'`. A page at `/cases` gets `/cases/views/:viewId`.

A page overrides it in its manifest, which is how an app speaks its users' language in the address bar:

```json
"savedViewPlaces": { "enabled": true, "routeBase": "lijsten" }
```

[`savedViewRouteBase`](./saved-view-route-base.md) reads the declaration and falls back to this, so callers never have to.
