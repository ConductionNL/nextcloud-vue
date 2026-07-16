<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
  - SPDX-License-Identifier: EUPL-1.2
-->

# Bundled NL-government icon catalogues

The `rvo.js`, `openGemeenten.js` and `denHaag.js` modules in this folder are
**auto-generated** by [`scripts/generate-nl-icons.mjs`](../../scripts/generate-nl-icons.mjs).
Each entry is `{ key, label, url }`, where `url` is a self-contained
`data:image/svg+xml,…` URI. Feed a set to `CnIconBrowser`'s `url-icons` prop
(they render as `<img>`, so the multi-path / illustrative artwork renders
faithfully — the single-path catalogue adapters cannot represent it).

```js
// The library ships src/, so import the set you need directly — only that
// module is pulled into the consuming app's bundle (the sets are large).
import { rvoIcons } from '@conduction/nextcloud-vue/src/icons/rvo.js'
// <CnIconBrowser :url-icons="rvoIcons" … />
```

## Sources & licences

All three sets are redistributable under a licence compatible with this
package (EUPL-1.2). **The proprietary City-of-Amsterdam icon set
(`@amsterdam/design-system-assets`) is deliberately NOT included** — its
`LICENSE.md` marks it proprietary, so it must not be redistributed here.

| Module | Set | Upstream | Licence | Icons |
| --- | --- | --- | --- | --- |
| `rvo.js` | RVO / ROOS (Rijksdienst voor Ondernemend Nederland) | npm `@nl-rvo/assets` (`icons/`) — https://github.com/nl-design-system/rvo | **CC0-1.0** (public domain; see package `LICENSE.md`) | 1163 |
| `openGemeenten.js` | OpenGemeenten Iconenset — "Line" style | https://github.com/OpenGemeenten/Iconenset (`Svg/Line/`) | **CC0-1.0** (README declares CC0; the CC-BY-NC-ND web-component wrapper is NOT used) | 256 |
| `denHaag.js` | Gemeente Den Haag icon set | https://github.com/nl-design-system/denhaag (`components/Icons/src/svg/`) | **EUPL-1.2** (`components/Icons/LICENSE.md`) | 69 |

## Regenerating

```sh
# Fetch the three sources into a working dir, then:
SRC_ROOT=/path/to/sources OUT_DIR=src/icons node scripts/generate-nl-icons.mjs
```

`SRC_ROOT` must contain:
- `nlrvo-assets/package/icons/**` — unpacked `@nl-rvo/assets` tarball
- `og/Iconenset-master/Svg/Line/*.svg` — OpenGemeenten `master` archive
- `denhaag-svg/*.svg` — the `components/Icons/src/svg` SVGs (category dirs flattened with `__`)
