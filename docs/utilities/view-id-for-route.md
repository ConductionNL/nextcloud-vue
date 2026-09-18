# viewIdForRoute

The view a route is showing, if it is a saved-view route at all.

## Signature

```js
viewIdForRoute(route: object): string|null
```

`route` is a vue-router route object, usually `$route`.

## Usage

```js
import { viewIdForRoute } from '@conduction/nextcloud-vue'

viewIdForRoute(this.$route)  // '42' on /cases/views/42, null on /cases
```

```js
watch: {
  $route: {
    immediate: true,
    handler(route) {
      const id = viewIdForRoute(route)
      if (id) {
        this.applyView(id)
      }
    },
  },
}
```

It reads `meta.cnSavedViewOf`, which [`buildManifestRoutes`](./build-manifest-routes.md) sets when it registers the view route. A page route that happens to carry a `viewId` param answers `null`, so a detail page addressed by view id is never mistaken for a saved view.

Either param name is accepted, `viewId` and `savedViewId`, because [`savedViewRoutePath`](./saved-view-route-path.md) picks between them.
