# getCurrentUserId

Returns the current Nextcloud user ID by reading `window.OC.currentUser`.

## Signature

```js
import { getCurrentUserId } from '@conduction/nextcloud-vue'

const uid = getCurrentUserId()   // 'admin' | null
```

## Returns

`string | null`:

- `window.OC.currentUser.uid` if present,
- else `window.OC.currentUser` (older Nextcloud versions set this directly to a string),
- else `null` (not logged in, or running outside a Nextcloud page — e.g. unit tests).

## Related

- [getCurrentUserGroups](./get-current-user-groups.md) — Async fetch of the user's groups.
- [isWidgetVisible](./is-widget-visible.md) — Primary consumer.
