# getCurrentUserGroups

Fetches the current Nextcloud user's group memberships from the OCS API (`/cloud/users/{userId}/groups`). Result is cached per-session so repeated calls do not hit the API again.

## Signature

```js
import { getCurrentUserGroups } from '@conduction/nextcloud-vue'

const groups = await getCurrentUserGroups()
// ['admin', 'KCC', 'finance']
```

## Returns

`Promise<string[]>` — array of group IDs the current user belongs to. Returns `[]` when:

- There is no logged-in user ([`getCurrentUserId`](./get-current-user-id.md) returns `null`).
- The OCS request fails (the error is logged to console, not thrown).

## Caching

The module keeps an in-memory cache keyed by user ID:

- First call kicks off an axios GET to the OCS endpoint and stores the promise.
- Concurrent callers in the same tick await the same in-flight promise (no duplicate requests).
- Subsequent calls after resolution return the cached array directly.

The cache can be cleared with [`resetVisibilityCache`](./reset-visibility-cache.md) — useful in tests or when the user context changes without a page reload.

## Related

- [getCurrentUserId](./get-current-user-id.md) — Synchronous user-ID lookup.
- [filterWidgetsByVisibility](./filter-widgets-by-visibility.md) — Primary consumer.
- [resetVisibilityCache](./reset-visibility-cache.md) — Clears the cache.
