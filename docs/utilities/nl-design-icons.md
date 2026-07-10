# NL_DESIGN_ICONS

`NL_DESIGN_ICONS` — the curated NL Design System icon pack, bundled into the
library as self-contained `data:` URIs so it needs **no external `nldesign` app**
installed. Each entry is `{ id, label, name, url }` where `url` is a base64
`image/svg+xml` data URI. This is the same 34-glyph set the `nldesign` app used
to serve under `img/icons/*.svg` (Amsterdam Design System assets, CC0); inlining
it here removes the app dependency and the 404s that appeared when it was
disabled.

The entry shape matches the `urlIcons` prop of [CnIconBrowser](../components/cn-icon-browser.md),
so a consumer can offer the pack on the picker's **Custom** tab directly:

```js
import { NL_DESIGN_ICONS } from '@conduction/nextcloud-vue'

// In a component that renders CnIconBrowser:
// <CnIconBrowser v-model="icon" :icons="catalogue" :url-icons="NL_DESIGN_ICONS" allow-url />
const labels = NL_DESIGN_ICONS.map((i) => i.label) // Airplane, Bell, Bike, …
```

Because every icon is a data URI, the pack renders identically whether or not the
`nldesign` app is enabled. See also [DASHBOARD_ICONS](./dashboard-icons.md) (the
MDI catalogue) and [isCustomIconUrl](./is-custom-icon-url.md).
