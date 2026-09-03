---
sidebar_position: 1
---

# NL government icon sets

The library bundles 1,488 Dutch government icons across three sets. This page tells you what is in them, what you may do with them, and which import path keeps your bundle small.

## What is bundled

| Set | Icons | Licence | Module |
|---|---|---|---|
| RVO / ROOS | 1,163 | CC0-1.0 | `src/icons/rvo.js` |
| OpenGemeenten, Line style | 256 | CC0-1.0 | `src/icons/openGemeenten.js` |
| Gemeente Den Haag | 69 | EUPL-1.2 | `src/icons/denHaag.js` |

RVO is the Rijksdienst voor Ondernemend Nederland. Every entry is `{ id, label, url }`, where `url` is a self-contained `data:image/svg+xml` URI. That matters twice: the artwork is multi-path and illustrative, which a single-path catalogue cannot represent, and a picked icon keeps rendering in an app that never imported the set.

The City of Amsterdam set is deliberately not bundled. Its licence marks it proprietary, so we may not redistribute it.

## Import the set you need, not the barrel

`src/icons/index.js` imports all three sets statically. Anything that touches it pulls RVO's 1.9 MB of data URIs into your eager bundle. Import the single set instead:

```js
import { rvoIcons } from '@conduction/nextcloud-vue/src/icons/rvo.js'
```

```vue
<CnIconBrowser :url-icons="rvoIcons" />
```

Only that module enters your bundle. Check your build output: an app importing `denHaag.js` alone should gain about 77 KB, not 2.3 MB.

## Offer all three, and defer the big one

For a picker with a tab per set, use `nlDesignIconGroups()`. It loads the two small sets with the page and defers RVO behind a dynamic import, so RVO is fetched the first time a user opens its tab and never otherwise:

```js
import { nlDesignIconGroups } from '@conduction/nextcloud-vue/src/icons/nlDesignGroups.js'
```

```vue
<CnIconBrowser :url-icon-groups="nlDesignIconGroups()" />
```

`CnIconBrowser` already defaults to this, so most apps need none of the above. Reach for it when you are building your own picker surface.

A group may declare `load()` instead of a populated `icons` array. The panel resolves it on first activation, which is how the RVO tab works.

## Regenerating the sets

The three modules are generated, not hand written. `scripts/generate-nl-icons.mjs` builds them from the upstream sources:

```sh
SRC_ROOT=/path/to/sources OUT_DIR=src/icons node scripts/generate-nl-icons.mjs
```

`SRC_ROOT` needs three directories:

- `nlrvo-assets/package/icons/**`, the unpacked `@nl-rvo/assets` tarball
- `og/Iconenset-master/Svg/Line/*.svg`, the OpenGemeenten `master` archive
- `denhaag-svg/*.svg`, the Den Haag SVGs with category directories flattened using `__`

The sources are `@nl-rvo/assets`, [OpenGemeenten/Iconenset](https://github.com/OpenGemeenten/Iconenset) and [nl-design-system/denhaag](https://github.com/nl-design-system/denhaag). Attribution and licence detail live in `src/icons/ATTRIBUTION.md`.

## Next

Wire a picked icon back into your interface with [Render whatever you stored](./index.md#render-whatever-you-stored), or read [CnIconBrowser](../components/cn-icon-browser.md) for the full prop list.
