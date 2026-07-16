<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

# `fromOpenGemeenten`

Icon-catalogue adapter for [`CnIconPicker`](../components/cn-icon-picker.md)'s enriched OpenGemeenten source — the Dutch governmental icon set from [gemeenteniconen.nl](https://www.gemeenteniconen.nl/). Turns a list of OpenGemeenten icons into the picker's catalogue shape.

The library bundles **no** icon pack. The OpenGemeenten icons are **CC0**, but the `@opengemeenten/iconset-web-component` npm package is **CC BY-NC-ND 4.0** — **you are responsible for confirming you are licensed to use it in your use case** (see the "Icon sets & licensing" section of the README).

```js
import { fromOpenGemeenten } from '@conduction/nextcloud-vue'

const catalogue = fromOpenGemeenten([
  { name: 'paspoort', path: 'M…' },
  { name: 'rijbewijs', svg: '<svg …><path d="M…"/></svg>' },
])

<CnIconPicker v-model="icon" searchable :sources="['opengemeenten']" :catalogues="{ opengemeenten: catalogue }" />
```

## Signature

`fromOpenGemeenten(list: Array<{ name?, key?, label?, path?, d?, svg?, viewBox? }>): Array<CatalogueEntry>`

- **list** — the icons you have loaded. Each item needs a `name`/`key` and either a `path`/`d` string or raw `svg` markup (the first `<path d="…">` is extracted).
- **returns** — entries sorted by label, de-duplicated by value.

See also: [`fromMdiJs`](from-mdi-js.md), [`fromFontAwesome`](from-font-awesome.md), [`dedupeCatalogue`](dedupe-catalogue.md).
