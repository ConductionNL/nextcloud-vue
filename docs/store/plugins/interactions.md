# interactionsPlugin

Adds the per-user interaction calls OpenRegister serves on a record: follow (watch, with its notifications switch), the deprecated favourite (a quiet follow) and the followers list. Each write puts the server's answer into the stored object's `@self`, so a list showing the same object agrees with the toggle that changed it. `CnFollowToggle` uses the same calls without the plugin installed; the plugin is for apps that drive them from their own code.

```js
import { createObjectStore, interactionsPlugin } from '@conduction/nextcloud-vue'

const useStore = createObjectStore('object', { plugins: [interactionsPlugin()] })
const store = useStore()

await store.favourite('case', caseId)
await store.watch('case', caseId)
const { data } = await store.fetchWatchers('case', caseId) // { results, total }
await store.addWatcher('case', caseId, 'jan')
```

## Actions

Every action returns `{ ok, status, data, message }` and never throws; `message` is the server's own message on failure.

| Action | Call | Writes into `@self` |
|--------|------|---------------------|
| `favourite(type, id)` | `PUT .../favourite` (deprecated: a quiet follow) | `favourite: true`, `watching: true` |
| `unfavourite(type, id)` | `DELETE .../favourite` (deprecated: unfollow) | `favourite: false`, `watching: false` |
| `watch(type, id, { notify })` | `PUT .../watch`, with `{"notify": bool}` when given | `watching: true`, `watchNotify` |
| `unwatch(type, id)` | `DELETE .../watch` | `watching: false` |
| `fetchWatchers(type, id)` | `GET .../watchers` (needs `update`) | — |
| `addWatcher(type, id, userId)` | `PUT .../watchers/{userId}` (needs `manage`) | — |
| `removeWatcher(type, id, userId)` | `DELETE .../watchers/{userId}` (needs `manage`, or yourself) | — |

Two more actions cover the read state (OpenRegister `object-read-state`): `markRead(type, id)` (`PUT .../read-state`, writes `unread: false` into `@self`) and `markUnread(type, id)` (`DELETE .../read-state`, writes `unread: true`).
