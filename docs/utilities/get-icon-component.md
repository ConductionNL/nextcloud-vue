# getIconComponent

`getIconComponent(name)` — resolve an icon name to a Vue component for `<component :is>`. Returns `null` when `name` is a URL (the caller must render `<img>`). For registry names, tolerates null/undefined/empty/unknown — all resolve to [DEFAULT_ICON](./default-icon.md)'s component; never throws on non-URL input.

```js
import { getIconComponent } from '@conduction/nextcloud-vue'
const comp = getIconComponent(dashboard.icon) // null for URLs
```

Backs [CnDashboardIcon](../components/cn-dashboard-icon.md). See also [isCustomIconUrl](./is-custom-icon-url.md), [DASHBOARD_ICONS](./dashboard-icons.md).
