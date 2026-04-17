# filterWidgetsByVisibility

Filters an array of dashboard widget definitions down to those visible to the current Nextcloud user. Drives the visibility logic inside [`useDashboardView`](./composables/use-dashboard-view.md) but can also be called directly from any custom widget loader.

## Signature

```js
import { filterWidgetsByVisibility } from '@conduction/nextcloud-vue'

const visible = await filterWidgetsByVisibility(allWidgets)
```

## Parameters

| Arg | Type | Description |
|-----|------|-------------|
| `widgets` | `Array` | Widget definitions. Each may have a `visibility: { users, groups }` block. |

## Returns

`Promise<Array>` — a new array containing only widgets the current user is allowed to see.

## Behaviour

1. Empty input → returns `[]`.
2. **Fast path:** if no widget declares `visibility`, the original array is returned unchanged (no OCS request is made).
3. Otherwise, fetches the current user's groups via [`getCurrentUserGroups`](./get-current-user-groups.md) (cached after the first call) and filters each widget via [`isWidgetVisible`](./is-widget-visible.md).

## Visibility semantics

For each widget:

- No `visibility` block → visible to everyone.
- `visibility.users` or `visibility.groups` both empty → visible to everyone.
- User ID in `visibility.users` → visible.
- User's groups overlap with `visibility.groups` → visible.
- Otherwise → hidden.

User and group lists combine with **OR** logic — either a user-ID match or a group match grants access.

## Related

- [useDashboardView](./composables/use-dashboard-view.md) — Primary consumer; re-runs this on mount and whenever widget definitions change.
- [isWidgetVisible](./is-widget-visible.md) — Synchronous per-widget predicate.
- [resetVisibilityCache](./reset-visibility-cache.md) — Clears the cached groups (tests, user switch).
