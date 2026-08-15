# applyMenuLayout

Applies the canonical navigation layout — `relocations` → `removals` → `settingsSection` — to an already-merged menu. Exposed separately from [`buildManifest`](./build-manifest.md) for apps that assemble their menu through a different path but still want the shared layout semantics.

```js
import { applyMenuLayout } from '@conduction/nextcloud-vue'

const laidOut = applyMenuLayout(menu, { relocations, removals, settingsSection })
```

| Param | Type | Description |
|-------|------|-------------|
| `menu` | `Array<object>` | The merged menu (mutated in place by the steps). |
| `menuLayout` | `object` | `{ relocations?, removals?, settingsSection? }`. |

Returns the laid-out menu. Runs [`applyMenuRelocations`](./apply-menu-relocations.md), then [`applyMenuRemovals`](./apply-menu-removals.md), then [`applySettingsSection`](./apply-settings-section.md).
