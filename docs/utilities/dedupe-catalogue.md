<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

# `dedupeCatalogue`

Small helper used by the [`CnIconPicker`](../components/cn-icon-picker.md) catalogue adapters. Removes duplicate entries by `value` (keeping the first occurrence) and drops entries without a value. Useful when composing catalogues from multiple sources by hand.

```js
import { dedupeCatalogue } from '@conduction/nextcloud-vue'

dedupeCatalogue([{ value: 'a' }, { value: 'a' }, { value: '' }, { value: 'b' }])
// [{ value: 'a' }, { value: 'b' }]
```

## Signature

`dedupeCatalogue(entries: Array<CatalogueEntry>): Array<CatalogueEntry>`

- **entries** — catalogue entries (each `{ key, label, value, search, path?, component?, viewBox? }`).
- **returns** — a new array with duplicate/empty values removed, order preserved.

See also: [`fromMdiJs`](from-mdi-js.md), [`fromFontAwesome`](from-font-awesome.md), [`fromOpenGemeenten`](from-open-gemeenten.md).
