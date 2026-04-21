---
sidebar_position: 2
---

# CRUD Store

A factory for creating Pinia stores with standard CRUD operations. Unlike the [Object Store](./object-store.md) which is **multi-type** (keyed by register/schema slugs), a CRUD store manages a **single entity type** with a flat list and a single active item.

Use this for any entity that has its own API endpoint and doesn't go through the register/schema system (e.g. sources, agents, applications, configurations, endpoints).

## createCrudStore

Factory function that creates a Pinia store with list/item state, pagination, filters, and async CRUD actions.

```js
import { createCrudStore } from '@conduction/nextcloud-vue'

export const useSourceStore = createCrudStore(name, config)
```

### Parameters

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `name` | String | Pinia store ID (e.g. `'source'`, `'agent'`) | **required** |
| `config.endpoint` | String | API resource path segment (e.g. `'sources'`) | **required** |
| `config.baseUrl` | String | API base URL (before endpoint) | `'/apps/openregister/api'` |
| `config.entity` | Function\|null | Entity class constructor for wrapping items | `null` |
| `config.cleanFields` | String[] | Fields to strip before POST/PUT | `['id','uuid','created','updated']` |
| `config.features` | Object | Feature flags (see below) | `{}` |
| `config.features.loading` | Boolean | Add `loading`/`error` state and getters | `false` |
| `config.features.viewMode` | Boolean | Add `viewMode` state, getter, and setter action | `false` |
| `config.parseListResponse` | Function | Custom response parser for `refreshList` (see below) | `(json) => json.results` |
| `config.plugins` | Array | Plugin definitions merged into the store (see [Plugins](#plugins)) | `[]` |
| `config.extend` | Object | Extra `{ state, getters, actions }` merged into the store | `{}` |

### Return Value

Returns a Pinia `defineStore` composable with the following API.

#### State

| Property | Type | Description |
|----------|------|-------------|
| `item` | Object\|null | The currently active/selected item |
| `list` | Array | The full list of items |
| `filters` | Object | Active filter criteria |
| `pagination` | Object | `{ page, limit }` |
| `loading` | Boolean | Whether a request is in progress (requires `features.loading`) |
| `error` | String\|null | Last error message (requires `features.loading`) |
| `viewMode` | String | Current view mode, e.g. `'cards'` (requires `features.viewMode`) |
| `_options` | Object | Internal config: `{ endpoint, cleanFields, baseApiUrl, entity }` (available to extend actions and plugins) |

#### Getters

| Getter | Condition | Description |
|--------|-----------|-------------|
| `isLoading` | `features.loading` | Alias for `state.loading` |
| `getError` | `features.loading` | Alias for `state.error` |
| `getViewMode` | `features.viewMode` | Alias for `state.viewMode` |

#### Actions

| Action | Signature | Description |
|--------|-----------|-------------|
| `setItem` | `(data)` | Set the active item. Wraps in Entity class if configured. Pass `null` to clear. |
| `setList` | `(data)` | Set the item list. Maps each item through Entity class if configured. |
| `setPagination` | `(page, limit?)` | Set pagination parameters. Default limit: 20. |
| `setFilters` | `(filters)` | Merge filter criteria into current filters. |
| `setViewMode` | `(mode)` | Set view mode (requires `features.viewMode`). |
| `refreshList` | `(search?, soft?)` | GET the list from the API. Optional search query. If `soft=true`, skips loading state toggle. |
| `getOne` | `(id)` | GET a single item by ID. Sets it as the active item. |
| `deleteOne` | `(item)` | DELETE an item (must have `.id`). Refreshes the list and clears the active item. |
| `save` | `(item)` | POST (no `.id`) or PUT (with `.id`). Cleans via `cleanForSave`, sets the active item, refreshes the list. |
| `cleanForSave` | `(item)` | Strip `cleanFields` from item. Override in `extend.actions` for custom cleaning. |

## Configuration Details

### `config.entity`

When provided, `setItem` and `setList` wrap raw API data in this class via `new Entity(data)`. When `null`, raw data is used as-is.

```js
import { Source } from '../../entities/index.js'

export const useSourceStore = createCrudStore('source', {
  endpoint: 'sources',
  entity: Source,
})
```

### `config.cleanFields`

Array of field names stripped from the item before POST/PUT. Default: `['id', 'uuid', 'created', 'updated']`.

Override for entities with extra read-only fields:

```js
export const useApplicationStore = createCrudStore('application', {
  endpoint: 'applications',
  entity: Application,
  cleanFields: ['id', 'uuid', 'created', 'updated', 'usage', 'owner'],
})
```

### `config.parseListResponse`

Called inside `refreshList` after the API responds. Receives the parsed JSON body with the **store instance as `this`**, so custom parsers can perform side effects (e.g. updating extra state).

Must return an array of items to pass to `setList`.

**Default:** `(json) => json.results`

**Custom example** (organisation store extracts user stats from the same response):

```js
export const useOrganisationStore = createCrudStore('organisation', {
  endpoint: 'organisations',
  entity: Organisation,
  parseListResponse(json) {
    this.setUserStats(json)      // side effect: update extra state
    return json.results || []    // return the list array
  },
  extend: {
    state: () => ({
      userStats: { total: 0, active: null, list: [] },
    }),
    actions: {
      setUserStats(stats) {
        this.userStats = { /* ... */ }
      },
    },
  },
})
```

### `config.extend`

Merge extra state, getters, and actions into the store. Actions with the same name as base actions **override** them.

| Property | Type | Description |
|----------|------|-------------|
| `extend.state` | Function | State factory returning extra state properties |
| `extend.getters` | Object | Extra getters (or overrides of base getters) |
| `extend.actions` | Object | Extra actions (or overrides of base actions) |

Inside extend actions, `this` is the full store instance. Use `this._options.baseApiUrl` to build API URLs and `this._options.cleanFields` to reference the configured clean fields.

## Plugins

Plugins factor out reusable sub-resource patterns that would otherwise be repeated across stores. Each plugin contributes extra state, getters, and actions; multiple plugins can be combined on a single store.

The plugin shape matches the one used by the [Object Store](./object-store.md):

```js
{
  name: 'myFeature',
  state: () => ({ /* ... */ }),
  getters: { /* ... */ },
  actions: { /* ... */ },
}
```

### Registering plugins

```js
import { createCrudStore, logsPlugin } from '@conduction/nextcloud-vue'

export const useSourceStore = createCrudStore('source', {
  endpoint: 'sources',
  entity: Source,
  plugins: [
    logsPlugin({ parentIdParam: 'source_id', autoRefreshOnItemChange: true }),
  ],
})
```

### Merge precedence

Plugins are merged **after** base actions and **before** `extend.actions`. This means:

1. Base actions (`setItem`, `refreshList`, `save`, etc.) are defined first.
2. Plugin actions run next — a plugin can override a base action (e.g. `logsPlugin` with `autoRefreshOnItemChange: true` overrides `setItem`).
3. `extend.actions` run last and can override anything from the plugin or the base.

State and getters follow the same ordering. If two plugins contribute a state field with the same name, the later plugin wins — order the `plugins` array accordingly.

### Available plugins

| Plugin | Purpose |
|--------|---------|
| [`logsPlugin`](./plugins/logs.md) | Fetch a per-item logs collection from a flat sub-resource endpoint (e.g. `/sources/logs?source_id=…`). |

Plugins from the object-store family (e.g. `auditTrailsPlugin`, `filesPlugin`) are shaped the same way and can be registered against a CRUD store provided they don't rely on the `_buildUrl(type, id)` helper that only the object store exposes.

### Writing your own plugin

A plugin is a plain object with the same optional keys as `extend`:

```js
export function statsPlugin() {
  return {
    name: 'stats',
    state: () => ({ stats: null, statsLoading: false }),
    getters: { getStats: (state) => state.stats },
    actions: {
      async refreshStats() {
        this.statsLoading = true
        try {
          const response = await fetch(this._options.baseApiUrl + '/stats')
          this.stats = await response.json()
        } finally {
          this.statsLoading = false
        }
      },
    },
  }
}
```

Inside plugin actions `this` is the fully-merged store, so you can read `this.item`, call other actions (`this.refreshList()`), and use `this._options.baseApiUrl` / `this._options.entity`.

When publishing a plugin under the `*Plugin` export name from the library's `src/index.js`, it must ship a doc page under `docs/store/plugins/` (enforced by [`scripts/check-docs.js`](../../scripts/check-docs.js)).

## Examples

### Minimal (pure CRUD)

```js
import { createCrudStore } from '@conduction/nextcloud-vue'
import { Source } from '../../entities/index.js'

export const useSourceStore = createCrudStore('source', {
  endpoint: 'sources',
  entity: Source,
})
```

**Result:** 8 lines instead of ~140. Provides `setItem`, `setList`, `refreshList`, `getOne`, `deleteOne`, `save`, `cleanForSave`, `setPagination`, `setFilters`.

### With features and a domain action

```js
import { createCrudStore } from '@conduction/nextcloud-vue'
import { Agent } from '../../entities/index.js'

export const useAgentStore = createCrudStore('agent', {
  endpoint: 'agents',
  entity: Agent,
  features: { loading: true, viewMode: true },
  parseListResponse(json) {
    return Array.isArray(json) ? json : (json.results || [])
  },
  extend: {
    actions: {
      async getStats() {
        const response = await fetch(this._options.baseApiUrl + '/stats')
        if (!response.ok) throw new Error('HTTP ' + response.status)
        return response.json()
      },
    },
  },
})
```

### Overriding base actions

Override `cleanForSave` for custom field handling while reusing `cleanFields`:

```js
export const useApplicationStore = createCrudStore('application', {
  endpoint: 'applications',
  entity: Application,
  cleanFields: ['id', 'uuid', 'created', 'updated', 'usage', 'owner'],
  features: { loading: true, viewMode: true },
  extend: {
    actions: {
      cleanForSave(item) {
        const cleaned = { ...item }
        for (const field of this._options.cleanFields) {
          delete cleaned[field]
        }
        // Custom: coerce boolean
        if (cleaned.active !== undefined) {
          cleaned.active = cleaned.active === '' ? true : Boolean(cleaned.active)
        }
        return cleaned
      },
    },
  },
})
```

### With extra state and custom parseListResponse

```js
export const useOrganisationStore = createCrudStore('organisation', {
  endpoint: 'organisations',
  entity: Organisation,
  features: { viewMode: true },
  parseListResponse(json) {
    this.setUserStats(json)
    return json.results || []
  },
  extend: {
    state: () => ({
      activeOrganisation: null,
      userStats: { total: 0, active: null, list: [] },
    }),
    getters: {
      activeOrganisationGetter: (state) => state.activeOrganisation,
    },
    actions: {
      setUserStats(stats) { /* ... */ },
      async joinOrganisation(uuid) { /* ... */ },
      async leaveOrganisation(uuid) { /* ... */ },
    },
  },
})
```

## TypeScript support

`createCrudStore` ships hand-written type definitions alongside the JavaScript
implementation. TypeScript consumers get full inference for the entity type,
feature flags, and the `extend` block — with correct `this` context inside
extend actions and getters.

### Entity inference

When `config.entity` is a class constructor, the entity instance type flows
through to `item`, `list`, and all base actions:

```ts
import { createCrudStore } from '@conduction/nextcloud-vue'
import { Source } from '../../entities/index.js'

export const useSourceStore = createCrudStore('source', {
  endpoint: 'sources',
  entity: Source, // inferred
})

const store = useSourceStore()
store.item                 // Source | null
store.list                 // Source[]
await store.getOne(1)      // Promise<Source>
await store.save({ name: 'x' }) // accepts Partial<Source>
```

### Raw-data stores (no entity class)

Pass the entity shape as an explicit type argument:

```ts
interface LogShape { id: number; message: string }

export const useLogStore = createCrudStore<'log', LogShape>('log', {
  endpoint: 'logs',
})

useLogStore().item // LogShape | null
```

### Feature flags

Each flag is a conditional type — it only adds the corresponding property to
the store when enabled:

```ts
const useStore = createCrudStore('x', {
  endpoint: 'xs',
  entity: X,
  features: { loading: true, viewMode: true },
})
const s = useStore()
s.loading     // boolean
s.error       // string | null
s.isLoading   // boolean (getter)
s.viewMode    // string
s.setViewMode('table')
```

Omit a flag and the corresponding property disappears from the type —
accessing it becomes a compile-time error. Requires TypeScript 5.0+ for the
flag-literal inference (older versions: use `as const`).

### `extend` with full `this` typing

Inside `extend.actions` and `extend.getters`, `this` is the fully-merged
store (base state + extend state + getters + base actions + extend
actions):

```ts
createCrudStore('source', {
  endpoint: 'sources',
  entity: Source,
  features: { loading: true },
  extend: {
    state: () => ({ sourceTest: null as object | null }),
    actions: {
      async setSourceTest(item: object | null) {
        this.sourceTest = item  // ✓ from extend.state
        this.item               // ✓ Source | null, from base
        this.loading            // ✓ boolean, from features.loading
        await this.refreshList() // ✓ base action
      },
    },
  },
})
```

Don't annotate `this` manually inside extend methods — TypeScript resolves it
automatically via `ThisType<...>`, and a manual annotation will break inference.

### Action override precedence

An `extend` action with the same name as a base action **replaces** the base
action on the returned store type. The extended signature wins:

```ts
const useStore = createCrudStore('o', {
  endpoint: 'xs',
  entity: Source,
  extend: {
    actions: {
      setItem(data: Source) { this.item = data }, // narrower than base
    },
  },
})
useStore().setItem // (data: Source) => void
```

### Exported helper types

```ts
import type {
  BaseState,
  BaseActions,
  MergedActions,
  Features,
  EntityClass,
  CrudConfig,
} from '@conduction/nextcloud-vue'
```

## CRUD Store vs Object Store

| | CRUD Store | Object Store |
|---|---|---|
| **Use case** | Single entity type with its own API endpoint | Objects within OpenRegister's register/schema system |
| **State shape** | Flat: `item`, `list` | Per-type: `collections[type]`, `objects[type][id]` |
| **API pattern** | `/api/{endpoint}` | `/api/objects/{register}/{schema}` |
| **Entity wrapping** | Optional via `config.entity` | Not used (raw objects) |
| **Plugin system** | No (use `extend` instead) | Yes (files, audit trails, relations, etc.) |
| **Caching** | None (list is refreshed on each mutation) | Per-type object cache |
| **Factory** | `createCrudStore(name, config)` | `createObjectStore(storeId, options)` |

## Usage in Components

```js
// In store.js (singleton initialization)
import { useSourceStore } from './modules/source.js'
const sourceStore = useSourceStore(pinia)
export { sourceStore }

// In a component
import { sourceStore } from '../../store/store.js'

// Read state
sourceStore.list         // Array of Source entities
sourceStore.item         // Currently active Source or null
sourceStore.loading      // Boolean (if features.loading enabled)

// Actions
await sourceStore.refreshList('search term')
await sourceStore.getOne(123)
await sourceStore.save({ title: 'New Source', type: 'internal' })
await sourceStore.deleteOne(sourceStore.item)
sourceStore.setItem(null) // clear selection
```
