# peekCurrentUserGroups

The current user's group ids, read synchronously. Code that cannot await, such
as the `@myGroups` filter token, uses this instead of
[`getCurrentUserGroups`](./get-current-user-groups.md).

## Signature

```js
import { peekCurrentUserGroups } from '@conduction/nextcloud-vue'

const groups = peekCurrentUserGroups()
// null while loading, then ['behandelaars', 'toezicht']
```

## Returns

`string[] | null`:

- the group ids once they are loaded;
- `null` while the first request is in flight (the first call starts it);
- `[]` when nobody is signed in.

The value is reactive. Read inside a `computed`, the computed runs again when
the groups arrive. It shares the cache of `getCurrentUserGroups`, so the
groups are fetched once per page. [`resetVisibilityCache`](./reset-visibility-cache.md)
clears both.
