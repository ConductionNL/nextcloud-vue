---
sidebar_position: 2
---

# Store Plugins

Plugins extend `createObjectStore` (and, as of the CRUD plugin support update, `createCrudStore`) with additional state, getters, and actions. Register them by passing their factories into the `plugins` array:

```js
import {
  createObjectStore,
  auditTrailsPlugin,
  relationsPlugin,
  filesPlugin,
  lifecyclePlugin,
  registerMappingPlugin,
  selectionPlugin,
  searchPlugin,
} from '@conduction/nextcloud-vue'

const useObjectStore = createObjectStore('myapp', {
  plugins: [
    auditTrailsPlugin(),
    relationsPlugin(),
    filesPlugin(),
    lifecyclePlugin(),
    registerMappingPlugin(),
    selectionPlugin(),
    searchPlugin(),
  ],
})
```

Each plugin ships with its own dedicated reference page:

| Plugin | Purpose |
|--------|---------|
| [auditTrailsPlugin](./plugins/audit-trails.md) | Object-scoped + global audit trails, statistics, and delete |
| [relationsPlugin](./plugins/relations.md) | `contracts`, `uses`, `used` sub-resources |
| [filesPlugin](./plugins/files.md) | File attachments (upload, publish, delete) + shared tags list |
| [lifecyclePlugin](./plugins/lifecycle.md) | Object lifecycle actions: lock, publish, revert, merge |
| [logsPlugin](./plugins/logs.md) | Per-item logs collection for CRUD stores (e.g. `/sources/logs?source_id=…`) |
| [registerMappingPlugin](./plugins/register-mapping.md) | Fetch registers and schemas for admin selects |
| [selectionPlugin](./plugins/selection.md) | Cross-type selection state (`selectedObjects`) |
| [searchPlugin](./plugins/search.md) | Dedicated search context: single collection slot, facets, cached schema/register |

## Building your own plugin

Most sub-resource plugins in this library are thin extensions of [`createSubResourcePlugin`](./sub-resource-plugin.md). When you need a paginated child collection hanging off an object URL (e.g. `/{register}/{schema}/{id}/<endpoint>`), reach for that factory first — it generates state, getters, and actions named after your sub-resource with no boilerplate.

## Standalone helpers re-exported by searchPlugin

The search plugin also exports three identifiers at module level that can be used independently of the store:

| Export | Description |
|--------|-------------|
| `SEARCH_TYPE` | Constant `'search'` — import to avoid hard-coding the string |
| `getRegisterApiUrl(registerId)` | Returns `/apps/openregister/api/registers/<id>` |
| `getSchemaApiUrl(schemaId)` | Returns `/apps/openregister/api/schemas/<id>` |

See [searchPlugin](./plugins/search.md#exported-helpers) for details.
