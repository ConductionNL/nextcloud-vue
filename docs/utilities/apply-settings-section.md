# applySettingsSection

Promotes the menu entries listed in `menu-layout.json#settingsSection` into Nextcloud's settings foldout — the `NcAppNavigationSettings` gear at the bottom-left of the navigation, outside the scrollable list. [`CnAppNav`](../components/cn-app-nav.md) renders every top-level item carrying `section: "settings"` as a flat entry inside that foldout (with an auto-prepended "Personal settings"). This lifts each listed id out of wherever it currently sits and tags it `section: "settings"`.

```js
import { applySettingsSection } from '@conduction/nextcloud-vue'

const menu = applySettingsSection(laidOutMenu, ['preferences', 'integrations'])
```

| Param | Type | Description |
|-------|------|-------------|
| `menu` | `Array<object>` | The merged + relocated + pruned menu. |
| `settingsIds` | `Array<string> \| undefined` | Entry ids to move to the foldout. |

Returns the menu with the settings entries lifted out.
