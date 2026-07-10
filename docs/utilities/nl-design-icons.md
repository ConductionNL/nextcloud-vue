# NL_DESIGN_ICONS

`NL_DESIGN_ICONS` — the flat, combined list of every bundled NL-government icon
(RVO + OpenGemeenten + Den Haag), each a self-contained `data:image/svg+xml`
URI. Each entry is `{ id, label, url }`. The pack is bundled INTO the library so
it needs **no external `nldesign` app installed**.

```js
import { NL_DESIGN_ICONS } from '@conduction/nextcloud-vue'
// <CnIconBrowser :url-icons="NL_DESIGN_ICONS" … />
```

For a picker with a sub-tab per set, prefer
[NL_DESIGN_ICON_GROUPS](./nl-design-icon-groups.md). Individual sets:
[rvoIcons](./rvo-icons.md), [openGemeentenIcons](./open-gemeenten-icons.md),
[denHaagIcons](./den-haag-icons.md). Provenance + licences: `src/icons/ATTRIBUTION.md`.
