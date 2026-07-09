# mdiCatalogue

Builds a [CnIconBrowser](../components/cn-icon-browser.md) catalogue from the `@mdi/js` namespace (named SVG-path-string exports like `mdiAccount`). Entries are **path-based** and emit the path string, so a stored value is self-contained and renders anywhere without the package present.

```js
import * as mdi from '@mdi/js'
import { mdiCatalogue } from '@conduction/nextcloud-vue'

const icons = mdiCatalogue(mdi)
// → [{ key: 'mdiAccount', label: 'Account', value: 'M12,4…', search: 'account', path: 'M12,4…' }, …]
```

## Signature

```
mdiCatalogue(mdiNamespace: Record<string, string>) => Array<{ key, label, value, search, path }>
```

Non-icon exports (e.g. the `version` string) and non-string values are filtered out; entries are sorted alphabetically by `label`. The library does not depend on `@mdi/js` — the consumer imports it and passes the namespace in.

See also [vmdiCatalogue](./vmdi-catalogue.md) for the `vue-material-design-icons` (component-based) source.
