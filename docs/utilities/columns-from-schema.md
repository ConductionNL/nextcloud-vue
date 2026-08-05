# columnsFromSchema

Generates `CnDataTable` column definitions from the `properties` block of an OpenRegister / JSON Schema object. Applies sensible defaults for common types (widths, sortability) and supports include/exclude lists plus per-column overrides.

## Signature

```js
import { columnsFromSchema } from '@conduction/nextcloud-vue'

const columns = columnsFromSchema(schema, {
  exclude: ['password'],
  include: null,
  overrides: { status: { width: '200px' } },
})
```

## Parameters

| Arg | Type | Default | Description |
|-----|------|---------|-------------|
| `schema` | `object` | — | Must have a `properties` object; otherwise `[]` is returned. |
| `options.exclude` | `string[]` | `[]` | Property keys to drop. |
| `options.include` | `string[] \| null` | `null` | Whitelist of keys to include. When provided, every other key is dropped. |
| `options.overrides` | `object` | `{}` | Keyed by property name; values are merged onto the generated column via `Object.assign`. |

## Returns

An array of column definitions:

```ts
{
  key: string,
  label: string,        // prop.title ?? key
  sortable: true,
  type: string,         // prop.type ?? 'string'
  format: string|null,  // prop.format ?? null
  width?: string,       // default for common type/format combos — see below
  enum?: any[],         // present when prop.enum is set
  items?: object,       // present when prop.items is set (for arrays)
  // …any keys from overrides[key]
}
```

## Default widths

| Type / format | Width |
|---|---|
| `boolean` | `80px` |
| `integer`, `number` | `100px` |
| `string` + `format: uuid` | `140px` |
| `string` + `format: date-time` | `180px` |
| `string` + `format: email` | `200px` |

## Filtering

Properties are dropped when:

- `prop.visible === false`
- key is in `options.exclude`
- `options.include` is provided and the key is not in it
- `prop.type === 'object'` (complex objects don't render well in tables)

## Sorting

Columns are sorted by:
1. `prop.order` (ascending numeric; missing values sort last as `Infinity`)
2. Alphabetical by key

## Related

- [filtersFromSchema](./filters-from-schema.md) — Same pattern, for `CnFilterBar`/`CnFacetSidebar`.
- [fieldsFromSchema](./fields-from-schema.md) — Same pattern, for form dialogs.
- [formatValue](./format-value.md) — Typical companion for rendering a column's cells.
