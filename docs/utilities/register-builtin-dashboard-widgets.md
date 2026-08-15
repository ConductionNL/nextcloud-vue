# registerBuiltinDashboardWidgets

An explicit no-op that guarantees the cn-widget-library catalog's self-registration side effects run, populating the shared [`dashboardWidgetRegistry`](./dashboard-widget-registry.md).

```js
import { registerBuiltinDashboardWidgets } from '@conduction/nextcloud-vue'

registerBuiltinDashboardWidgets()
```

Takes no arguments and returns `void`.

The module that defines this function imports every built-in widget's `index.js`, each of which self-registers its `{ renderer, form, defaultContent, displayName, icon }` into the registry at load time (via [`registerDashboardWidget`](./register-dashboard-widget.md)). The library barrel already imports that module, so the catalog is populated whenever a consuming app imports `@conduction/nextcloud-vue`.

Call this function once at app bootstrap if a bundler tree-shakes the bare side-effect imports — invoking it forces the module (and therefore every widget's registration) to be evaluated. See [`dashboardWidgetRegistry`](./dashboard-widget-registry.md) for the self-registration pattern.
