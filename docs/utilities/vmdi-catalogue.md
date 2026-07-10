# vmdiCatalogue

Builds a [CnIconBrowser](../components/cn-icon-browser.md) catalogue from a Webpack require-context over `vue-material-design-icons` — the Vue-component icon set used across Nextcloud. Entries are **component-based** and emit the component **name** (e.g. `'CalendarRange'`); render a stored value back with the same package.

```js
import { vmdiCatalogue } from '@conduction/nextcloud-vue'

// Use a LAZY context so only the icons actually shown get loaded —
// otherwise all ~7,400 components are pulled into the bundle.
const ctx = require.context('vue-material-design-icons', false, /\.vue$/, 'lazy')
const icons = vmdiCatalogue(ctx)
// → [{ key: 'CalendarRange', label: 'Calendar Range', value: 'CalendarRange', search: 'calendar range', component }, …]
```

## Signature

```
vmdiCatalogue(requireContext: Function & { keys(): string[] }) => Array<{ key, label, value, search, component }>
```

Each `component` is wrapped as an async component, so a lazy context loads icons on demand. Entries are sorted alphabetically by `label`. The library does not depend on `vue-material-design-icons` for this — the consumer supplies the context.

See also [mdiCatalogue](./mdi-catalogue.md) for the `@mdi/js` (path-string) source.
