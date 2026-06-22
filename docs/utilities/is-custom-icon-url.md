# isCustomIconUrl

`isCustomIconUrl(name)` — discriminator for a dashboard's `icon` field: returns `true` when the value is a non-empty string starting with `/` or `http` (render as `<img>`), `false` for registry keys / null / empty.

```js
import { isCustomIconUrl } from '@conduction/nextcloud-vue'
if (isCustomIconUrl(icon)) { /* render <img :src="icon"> */ }
```

See also [getIconComponent](./get-icon-component.md), [DASHBOARD_ICONS](./dashboard-icons.md).
