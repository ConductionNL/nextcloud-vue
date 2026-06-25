# applyMenuRemovals

Removes individual menu entries by id after relocation — used to retire duplicate navigation entries whose **page must stay routable** (deep links and e2e specs hit the route directly). Declared in `menu-layout.json#removals`.

Only leaf entries are removed; a group is dropped only when it is explicitly removed **or** left empty after its children were removed/relocated away. A group carrying a `route` / `href` / `action` is itself clickable (a direct-link top-level item) and survives even when all its children are gone.

```js
import { applyMenuRemovals } from '@conduction/nextcloud-vue'

const menu = applyMenuRemovals(mergedMenu, ['duplicate-entry-id'])
```

| Param | Type | Description |
|-------|------|-------------|
| `menu` | `Array<object>` | The merged menu. |
| `removals` | `Array<string> \| undefined` | Menu-entry ids to drop. |

Returns the menu without the removed entries.
