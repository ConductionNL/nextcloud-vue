# searchPlugin

Adds a dedicated search context to the object store. Unlike the main type-keyed collections (`collections[type]`), the search state is a **single mutable slot** with its own collection, pagination, loading flag, cached schema/register, and facet data. The slot is replaced on every `refetchSearchCollection()` call, making this plugin ideal for backing a "search across registers" page.

The plugin also exports three standalone helpers at module level: `SEARCH_TYPE`, `getRegisterApiUrl`, and `getSchemaApiUrl`.

## Usage

```js
import {
  createObjectStore,
  searchPlugin,
  SEARCH_TYPE,
  getRegisterApiUrl,
  getSchemaApiUrl,
} from '@conduction/nextcloud-vue'

const useMyStore = createObjectStore('myapp', {
  plugins: [searchPlugin()],
})

const store = useMyStore()

// Configure
store.setSearchParams({
  register: 'reg-1',
  schema: 'schema-1',
  _search: 'foo',
  _page: 1,
  _limit: 20,
  filters: { status: ['open', 'pending'] },
})
store.setSearchVisibleColumns(['title', 'status', 'createdAt'])

await store.refetchSearchCollection()

// Read results
store.searchCollection    // Array
store.searchPagination    // { total, page, pages, limit }
store.searchLoading       // boolean
store.searchSchema        // object | null
store.searchRegister      // object | null
store.searchFacets        // { field: { values: [{ value, count }] } }

// Partial update (only touches provided keys)
store.updateSearchParams({ _page: 2 })

// Reset results (keeps searchParams)
store.clearSearchCollection()
```

## State

| Property | Type | Description |
|----------|------|-------------|
| `searchParams` | `object` | Active query params. Must contain `register` and `schema`. All other keys are forwarded as query-string params (`_search`, `_page`, `_limit`, `_order`, `filters`, …). |
| `searchVisibleColumns` | `string[]` | Column keys visible in the search results table. |

Internal state (read via getters): `_searchCollection`, `_searchPagination`, `_searchLoading`, `_searchSchema`, `_searchRegister`, `_searchFacets`, `_searchRequestId` (used to discard stale in-flight responses).

## Getters

| Getter | Returns |
|--------|---------|
| `searchCollection` | `Array` — result objects from the last fetch |
| `searchPagination` | `{ total, page, pages, limit }` |
| `searchLoading` | `boolean` |
| `searchSchema` | `object \| null` — cached schema for the current `register`/`schema` pair |
| `searchRegister` | `object \| null` — cached register for the current `register`/`schema` pair |
| `searchFacets` | `object` — CnIndexSidebar-compatible shape: `{ field: { values: [{ value, count }] } }` |

## Actions

| Action | Signature | Description |
|--------|-----------|-------------|
| `setSearchParams` | `(params) => void` | **Replace** all params. Clears the cached schema/register when `register`/`schema` differs from the current value. |
| `updateSearchParams` | `(params) => void` | **Merge** params (only listed keys overwritten). Same register/schema cache invalidation as above. |
| `setSearchVisibleColumns` | `(columns: string[]) => void` | Replace visible columns. |
| `clearSearchCollection` | `() => void` | Reset collection, pagination, and facets. Does **not** touch `searchParams` or `searchVisibleColumns`. |
| `refetchSearchCollection` | `() => Promise<Array>` | Fetch using current params. See behaviour below. |

### `refetchSearchCollection` behaviour

1. Requires `register` and `schema` in `searchParams`; otherwise logs a warning and returns `[]`.
2. Flattens `searchParams.filters` (if an object) into top-level query params (so `filters: { status: ['open'] }` becomes `?status=open`).
3. Auto-registers the object type via `createObjectTypeSlug(register, schema)` so later `saveObject`/`deleteObject` calls work.
4. Kicks off non-blocking parallel fetches for the schema (via [`getSchemaApiUrl`](#exported-helpers)) and register (via [`getRegisterApiUrl`](#exported-helpers)) **only** when not already cached.
5. Uses an internal `_searchRequestId` counter so a newer in-flight fetch always wins; older responses are discarded after the fetch or after JSON parsing.
6. When the response includes `facets` with `buckets` (or `data.buckets`), transforms them into `{ values: [{ value, count }] }` per field.

## Exported helpers

These are exported at module level alongside the plugin factory.

| Name | Type | Description |
|------|------|-------------|
| `SEARCH_TYPE` | `string` | Constant `'search'`. Import instead of hard-coding the literal. |
| `getRegisterApiUrl(registerId)` | `string` | Returns `/apps/openregister/api/registers/<id>` (URL-prefixed). |
| `getSchemaApiUrl(schemaId)` | `string` | Returns `/apps/openregister/api/schemas/<id>` (URL-prefixed). |

Both URL helpers are pure — safe to import and use outside the store when you only need the path.

## Notes

- Facets are only populated when the API response includes a `facets` key. Otherwise `searchFacets` retains its previous value until `clearSearchCollection()` is called.
- `_searchRequestId` protects against race conditions: two concurrent `refetchSearchCollection()` calls will each get their own ID, but only the latest writes to state.
- On HTTP or network errors the fetch returns `[]` and logs to console — no error is written to state for this plugin (unlike the sub-resource plugins).
