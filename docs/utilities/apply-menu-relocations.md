# applyMenuRelocations

Re-homes merged menu entries onto the canonical navigation layout declared by `menu-layout.json#relocations` (a `{ sourceId: targetGroupId }` map).

- A relocated **group** dissolves: its children merge (by id) into the target group and the now-empty shell is dropped.
- A relocated **leaf** (top-level, or a child of any group) moves under the target group.

```js
import { applyMenuRelocations } from '@conduction/nextcloud-vue'

const menu = applyMenuRelocations(mergedMenu, { 'old-group': 'reporting', 'stray-leaf': 'admin' })
```

| Param | Type | Description |
|-------|------|-------------|
| `menu` | `Array<object>` | The merged menu (mutated in place). |
| `relocations` | `Record<string, string> \| undefined` | Source-id → target-group-id map. |

Returns the menu with relocations applied. Resolves transitive moves over a few passes.
