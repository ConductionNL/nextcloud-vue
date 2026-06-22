# DASHBOARD_ICONS

`DASHBOARD_ICONS` — a frozen map of icon registry name → Vue MDI component reference, the curated built-in icon set for dashboard surfaces. Keys (e.g. `'Star'`, `'ViewDashboard'`) are the canonical strings persisted on a dashboard's `icon` field; iteration order is the order options appear in pickers.

```js
import { DASHBOARD_ICONS } from '@conduction/nextcloud-vue'
const names = Object.keys(DASHBOARD_ICONS) // picker options
```

Used by [CnIconPicker](../components/cn-icon-picker.md) (default `icons` prop) and [CnDashboardIcon](../components/cn-dashboard-icon.md). See also [DEFAULT_ICON](./default-icon.md), [getIconComponent](./get-icon-component.md), [isCustomIconUrl](./is-custom-icon-url.md).
