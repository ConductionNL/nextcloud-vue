<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

# `fromMdiJs`

Icon-catalogue adapter for [`CnIconPicker`](../components/cn-icon-picker.md)'s enriched MDI source. Turns the `@mdi/js` module (a map of `mdiXxx` export → SVG path string) into the picker's catalogue shape.

The library bundles **no** icon pack — you import `@mdi/js` yourself and pass it in.

```js
import { fromMdiJs } from '@conduction/nextcloud-vue'
import * as mdi from '@mdi/js'

const catalogue = fromMdiJs(mdi)
// [{ key: 'mdiAccount', label: 'Account', value: 'mdiAccount', search: '…', path: 'M…', viewBox: '0 0 24 24' }, …]

<CnIconPicker v-model="icon" searchable :sources="['mdi']" :catalogues="{ mdi: catalogue }" />
```

## Signature

`fromMdiJs(mdiModule: Record<string, string>): Array<CatalogueEntry>`

- **mdiModule** — the `@mdi/js` module namespace.
- **returns** — catalogue entries sorted by label, de-duplicated by value. The emitted `value` is the export name (e.g. `mdiAccount`); `path` is the SVG `d` string; `viewBox` is `0 0 24 24`.

When the `mdi` source is enabled without a supplied catalogue, `CnIconPicker` calls this adapter internally against a lazily-imported `@mdi/js` (optional dependency), falling back to the built-in `DASHBOARD_ICONS` set when absent.

See also: [`fromFontAwesome`](from-font-awesome.md), [`fromOpenGemeenten`](from-open-gemeenten.md), [`dedupeCatalogue`](dedupe-catalogue.md).
