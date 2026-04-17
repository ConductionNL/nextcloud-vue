# resetVisibilityCache

Clears the in-memory cache used by [`getCurrentUserGroups`](./get-current-user-groups.md). After this call the next `getCurrentUserGroups()` invocation will hit the OCS API again.

## Signature

```js
import { resetVisibilityCache } from '@conduction/nextcloud-vue'

resetVisibilityCache()
```

No arguments, no return value.

## When to call

- **Tests** — reset between test cases so one test's cached groups don't bleed into the next.
- **User-context changes** — if a single-page app swaps the active user without a full reload (rare in Nextcloud), call this so widget visibility re-evaluates against the new user.

In normal app code you do not need to call this — the cache is scoped to the page load, and navigating away discards it automatically.

## Related

- [getCurrentUserGroups](./get-current-user-groups.md) — The function whose cache this clears.
- [filterWidgetsByVisibility](./filter-widgets-by-visibility.md) — Downstream consumer of the cached groups.
