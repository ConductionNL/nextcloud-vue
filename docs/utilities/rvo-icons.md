# rvoIcons

`rvoIcons` — the **RVO / ROOS** icon catalogue (Rijksdienst voor Ondernemend
Nederland), 1163 glyphs bundled as self-contained `data:image/svg+xml` URIs.
Each entry is `{ id, label, url }`. Public domain (**CC0-1.0**) — see
[`src/icons/ATTRIBUTION.md`](https://codeberg.org/Conduction/nextcloud-vue/src/branch/beta/src/icons/ATTRIBUTION.md).

```js
// Import the set directly so bundlers pull only what you use (the sets are large):
import { rvoIcons } from '@conduction/nextcloud-vue/src/icons/rvo.js'
// <CnIconBrowser :url-icons="rvoIcons" … />
```

Part of [NL_DESIGN_ICON_GROUPS](./nl-design-icon-groups.md); see also
[openGemeentenIcons](./open-gemeenten-icons.md), [denHaagIcons](./den-haag-icons.md).
