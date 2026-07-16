# mergePages

Merges an array of incoming page definitions into a target array, keyed by `id`. A new page id is appended; an existing id is replaced in place so a fragment can override a base page by re-declaring it. Used by [`buildManifest`](./build-manifest.md) to fold `manifest.d/*.json` fragment pages onto the base manifest.

```js
import { mergePages } from '@conduction/nextcloud-vue'

mergePages(targetPages, fragment.pages)
```

| Param | Type | Description |
|-------|------|-------------|
| `target` | `Array<object>` | The accumulated pages (mutated in place). |
| `incoming` | `Array<object>` | Page definitions from a fragment. |

Returns nothing — `target` is mutated in place.
