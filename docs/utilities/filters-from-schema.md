# filtersFromSchema

Generates filter definitions from the `properties` block of a schema. Only properties flagged `facetable: true` are emitted — this is the marker that turns a schema property into a filter in `CnFilterBar` / `CnFacetSidebar`.

## Signature

```js
import { filtersFromSchema } from '@conduction/nextcloud-vue'

const filters = filtersFromSchema(schema)
```

## Parameters

| Arg | Type | Description |
|-----|------|-------------|
| `schema` | `object` | Schema with a `properties` object. Returns `[]` when missing. |

No options — unlike [`columnsFromSchema`](./columns-from-schema.md) / [`fieldsFromSchema`](./fields-from-schema.md) this helper is config-free; tweak output by editing the schema's `facetable` flags.

## Returns

```ts
{
  key: string,
  label: string,           // prop.title ?? key
  description: string,
  propertyType: string,    // prop.type ?? 'string'
  type: 'checkbox' | 'select',
  options: Array<{ id, label }>,  // prefilled for enum properties; [] otherwise (load from facet API at runtime)
  value: null,
}[]
```

## Filter type mapping

| Property shape | `type` | `options` |
|---|---|---|
| `type: 'boolean'` | `'checkbox'` | `[]` |
| `enum: [...]` | `'select'` | `enum.map(v => ({ id: v, label: v }))` |
| anything else | `'select'` | `[]` — populate dynamically from the facet API |

## Sorting

Same as other schema helpers: `prop.order` ascending, alphabetical tie-break.

## Related

- [columnsFromSchema](./columns-from-schema.md)
- [fieldsFromSchema](./fields-from-schema.md)
