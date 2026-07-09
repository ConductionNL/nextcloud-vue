# mergeMenuItems

Merges an array of incoming menu items into a target array, keyed by `id`. New ids are appended; existing ids are merged in place — the first definition of each key wins (the base manifest loads first, so its canonical group definitions take precedence), and `children` are unioned recursively by the same rule. Fragments may therefore extend an existing group by re-declaring only its `id` plus their own `children`.

```js
import { mergeMenuItems } from '@conduction/nextcloud-vue'

mergeMenuItems(targetMenu, fragment.menu)
```

| Param | Type | Description |
|-------|------|-------------|
| `target` | `Array<object>` | The accumulated menu (mutated in place). |
| `incoming` | `Array<object>` | Menu items from a fragment. |

Returns nothing — `target` is mutated in place.
