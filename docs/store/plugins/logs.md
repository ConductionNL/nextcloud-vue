# logsPlugin

Adds per-item **logs** support to a [`createCrudStore`](../crud-store.md). Targets the common pattern where logs for a resource live at a flat sub-endpoint filtered by a parent id (e.g. `/sources/logs?source_id=<id>`), rather than nested under the item (`/sources/<id>/logs`).

## Usage

```js
import { createCrudStore, logsPlugin } from '@conduction/nextcloud-vue'
import { Source } from '../../entities/index.js'

export const useSourceStore = createCrudStore('source', {
  endpoint: 'sources',
  entity: Source,
  plugins: [
    logsPlugin({
      parentIdParam: 'source_id',
      autoRefreshOnItemChange: true,
    }),
  ],
})

// Later — in a component
const store = useSourceStore()
await store.refreshLogs()                           // GET /sources/logs?source_id=<current item id>&_sort[created]=desc
await store.refreshLogs({ _limit: 50, level: 'error' }) // custom filters merged in
console.log(store.logs, store.logsLoading, store.logsError)
store.clearLogs()
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `parentIdParam` | `string` | **required** | Query-parameter name carrying the active item's id (e.g. `'source_id'`). |
| `path` | `string` | `'logs'` | Segment appended to the store's base API URL. Final URL is `${baseApiUrl}/${path}`. |
| `defaultSort` | `object` | `{ '_sort[created]': 'desc' }` | Default query params merged before caller-supplied filters. |
| `autoRefreshOnItemChange` | `boolean` | `false` | When `true`, the plugin's `setup` hook registers a `store.$onAction` subscriber that calls `refreshLogs()` after every `setItem` (or `clearLogs()` when the item is cleared). Composes with other plugins that observe `setItem`. |

## State

| Property | Type | Description |
|----------|------|-------------|
| `logs` | `unknown` | Response body from the most recent `refreshLogs` call (array or `{ results, ... }` shape). |
| `logsLoading` | `boolean` | Whether a refresh is in flight. |
| `logsError` | `ApiError \| null` | Last error, or `null`. |

## Getters

`getLogs`, `isLogsLoading`, `getLogsError`.

## Actions

| Action | Signature | Description |
|--------|-----------|-------------|
| `refreshLogs` | `(filters?) => Promise<{ response, data }>` | GET the logs endpoint. Auto-injects `parentIdParam = this.item.id` unless `filters` already sets that key, then merges `defaultSort`, then merges `filters` (caller wins). On a non-OK response, sets `logsError` and returns `{ response, data: null }` without throwing. On fetch rejection, sets `logsError` and rethrows. |
| `setLogs` | `(data) => void` | Replace `logs` state directly (useful when another action returns logs as a side effect). |
| `clearLogs` | `() => void` | Reset `logs`, `logsLoading`, `logsError` to defaults. |

## Notes

- **URL construction** is `this._options.baseApiUrl + '/' + path`, so the plugin inherits whatever base URL the parent store resolves (including any `/index.php` prefix from [`prefixUrl`](../../utilities/prefix-url.md)).
- **Per-store loading**: `logsLoading` is scoped to each store instance. Components that previously read a shared `logsLoading` flag from a global log store should read the store's own `logsLoading` / `isLogsLoading` instead.
- **Opt-in auto-refresh**: `autoRefreshOnItemChange` is off by default because many stores fetch logs on demand (e.g. tab open) rather than on every item change.
- **Overriding**: `extend.actions` runs *after* plugins, so you can still override `refreshLogs` in `extend` if the default behavior doesn't fit. Auto-refresh is wired via `$onAction`, so it keeps firing even when `extend.actions.setItem` replaces the base `setItem` — the subscriber observes whatever action ends up in the `setItem` slot.
- **Errors**: non-OK responses produce an [`ApiError`](../../utilities/parse-response-error.md); `TypeError` rejections (offline, CORS) produce a [`networkError`](../../utilities/network-error.md); anything else produces a [`genericError`](../../utilities/generic-error.md).
