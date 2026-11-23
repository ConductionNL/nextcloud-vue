# routesFromManifest

`routesFromManifest(manifest, { component?, fallback? })` gives the vue-router routes of a manifest: one per page, named by its `id`, at its `route`, rendered by `CnPageRenderer` (or `component`), with `props` on a route that has parameters, and a catch-all that redirects to `fallback` (default `/`).

```js
const router = createRouter({ history: createWebHistory(appRouterBase('larpinq')), routes: routesFromManifest(manifest) })
```

Part of [mountCnApp](./mount-cn-app.md).
