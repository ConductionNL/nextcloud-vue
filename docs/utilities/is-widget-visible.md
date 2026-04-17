# isWidgetVisible

Synchronous predicate: returns `true` when a single widget is visible to the given user + groups. Used internally by [`filterWidgetsByVisibility`](./filter-widgets-by-visibility.md); exported for consumers that already have the user ID and groups and want to run the check themselves without re-fetching.

## Signature

```js
import { isWidgetVisible, getCurrentUserId, getCurrentUserGroups } from '@conduction/nextcloud-vue'

const userId = getCurrentUserId()
const userGroups = await getCurrentUserGroups()

const visible = isWidgetVisible(widget, userId, userGroups)
```

## Parameters

| Arg | Type | Description |
|-----|------|-------------|
| `widget` | `object` | Widget definition. Checks `widget.visibility.users` (array of user IDs) and `widget.visibility.groups` (array of group names). |
| `userId` | `string \| null` | Current user ID. |
| `userGroups` | `string[]` | Current user's group memberships. |

## Returns

`boolean`.

## Visibility rules

Evaluated in this order — the first match that grants access wins:

1. No `widget.visibility` block → **visible**.
2. Both `users` and `groups` empty → **visible**.
3. `userId` is listed in `visibility.users` → **visible**.
4. Any group in `userGroups` appears in `visibility.groups` → **visible**.
5. Otherwise → **hidden**.

`users` and `groups` combine with **OR** logic: either match is enough.

## Related

- [filterWidgetsByVisibility](./filter-widgets-by-visibility.md) — Async wrapper that fetches the user's groups.
- [getCurrentUserId](./get-current-user-id.md) / [getCurrentUserGroups](./get-current-user-groups.md) — Supplies the inputs.
