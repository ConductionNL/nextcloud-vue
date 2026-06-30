# buildManifest

Builds an app's effective manifest from its bundled base manifest, its modular `manifest.d/*.json` fragments (ADR-037), and its `menu-layout.json`. Lifts the ~200-line navigation pipeline that every manifest-v2 app used to inline in `src/main.js` into a single shared implementation: fragment merging, canonical relocations, removals, and the settings-section foldout.

```js
import { buildManifest } from '@conduction/nextcloud-vue'

const manifest = buildManifest(base, fragments, menuLayout)
// → { ...base, pages, menu }
```

| Param | Type | Description |
|-------|------|-------------|
| `base` | `object` | The bundled base manifest (`src/manifest.json`). |
| `fragments` | `Array<object>` | Fragment objects (each may carry `pages` / `menu`). |
| `menuLayout` | `object` | `{ relocations?, removals?, settingsSection? }`. |

Returns the merged manifest `{ ...base, pages, menu }`. Internally composes [`mergePages`](./merge-pages.md), [`mergeMenuItems`](./merge-menu-items.md), and [`applyMenuLayout`](./apply-menu-layout.md).
