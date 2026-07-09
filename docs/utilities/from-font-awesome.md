<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

# `fromFontAwesome`

Icon-catalogue adapter for [`CnIconPicker`](../components/cn-icon-picker.md)'s enriched FontAwesome source. Turns imported FontAwesome packs (`fas` / `far` / `fab`) into the picker's catalogue shape, de-duplicated by value across packs.

The library bundles **no** icon pack — you import the FontAwesome packs yourself and pass them in. **You are responsible for confirming you are licensed to use FontAwesome in your use case** (see the "Icon sets & licensing" section of the README).

```js
import { fromFontAwesome } from '@conduction/nextcloud-vue'
import { fas } from '@fortawesome/free-solid-svg-icons'
import { fab } from '@fortawesome/free-brands-svg-icons'

const catalogue = fromFontAwesome({ fas, fab })

<CnIconPicker v-model="icon" searchable :sources="['fontawesome']" :catalogues="{ fontawesome: catalogue }" />
```

## Signature

`fromFontAwesome(packs: { fas?, far?, fab? }): Array<CatalogueEntry>`

- **packs** — any combination of the imported `fas` / `far` / `fab` pack objects.
- **returns** — entries sorted by label, de-duplicated by value in pack order. The emitted `value` is the FA `iconName` (e.g. `house`); `path` is the definition's SVG path (the last layer if the pathData is an array); `viewBox` is derived from the icon's width/height.

See also: [`fromMdiJs`](from-mdi-js.md), [`fromOpenGemeenten`](from-open-gemeenten.md), [`dedupeCatalogue`](dedupe-catalogue.md).
