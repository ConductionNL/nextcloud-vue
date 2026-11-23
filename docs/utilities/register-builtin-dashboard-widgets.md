# registerBuiltinDashboardWidgets

An explicit no-op that guarantees the cn-widget-library catalog's self-registration side effects run, populating the shared [`dashboardWidgetRegistry`](./dashboard-widget-registry.md).

```js
import { registerBuiltinDashboardWidgets } from '@conduction/nextcloud-vue'

registerBuiltinDashboardWidgets()
```

Takes no arguments and returns `void`.

The module that defines this function imports every built-in widget's `index.js`, each of which self-registers its `{ renderer, form, defaultContent, displayName, icon }` into the registry at load time (via [`registerDashboardWidget`](./register-dashboard-widget.md)). The library barrel already imports that module, so the catalog is populated whenever a consuming app imports `@conduction/nextcloud-vue`.

Calling it is now optional: `CnDashboardPage` and `CnDetailPage` import the catalog module themselves, so a dashboard opened fresh renders `stat`, `delta`, `gauge` and `countdown` tiles without any call in `main.js`. Apps that still call it are unaffected, since the module body runs once and a second call changes nothing. If you register widgets before any page has mounted and a bundler tree-shakes the bare side-effect imports, invoking it forces the module (and therefore every widget's registration) to be evaluated. See [`dashboardWidgetRegistry`](./dashboard-widget-registry.md) for the self-registration pattern.
