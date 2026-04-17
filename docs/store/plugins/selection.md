# selectionPlugin

Adds selection state to the object store. Manages a flat list of selected object IDs across all types, with a helper to check whether an entire collection is selected and to toggle selection for one type at a time.

## Usage

```js
import { createObjectStore, selectionPlugin } from '@conduction/nextcloud-vue'

const useMyStore = createObjectStore('myapp', {
  plugins: [selectionPlugin()],
})

const store = useMyStore()

store.setSelectedObjects(['abc', 'def'])
store.toggleSelectAllObjects('invoice')     // selects/deselects every id in store.collections.invoice
store.isAllSelected('invoice')              // true | false
store.clearSelectedObjects()
```

## State

| Property | Type |
|----------|------|
| `selectedObjects` | `string[]` — IDs of currently selected objects across all types |

## Getters

| Getter | Signature | Description |
|--------|-----------|-------------|
| `isAllSelected` | `(type: string) => boolean` | `true` when every row in `state.collections[type]` is in `selectedObjects`. Returns `false` for empty collections. Resolves each row's ID as `row.id ?? row['@self']?.id`. |

## Actions

| Action | Signature | Description |
|--------|-----------|-------------|
| `setSelectedObjects` | `(ids: string[]) => void` | Replace the selection. Non-array input becomes `[]`. |
| `clearSelectedObjects` | `() => void` | Deselect everything. |
| `toggleSelectAllObjects` | `(type: string) => void` | If the whole collection for `type` is already selected, remove **only that type's IDs** from `selectedObjects`. Otherwise, add every ID from `store.getCollection(type)` (deduped against the existing selection). Selections from other types are preserved. |

## Notes

- `selectedObjects` is a flat array shared across types — IDs from different types coexist. If you need per-type isolation, create separate store instances.
- The plugin expects `getCollection(type)` and `state.collections` to be provided by the host store (both are standard on `createObjectStore`).
