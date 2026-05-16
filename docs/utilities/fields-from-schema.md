# fieldsFromSchema

Generates form-field descriptors from the `properties` block of a schema. Used by [`CnFormDialog`](../components/cn-form-dialog.md) and similar auto-generated forms. Each field descriptor includes a resolved `widget` name so the form can pick the right input component.

## Signature

```js
import { fieldsFromSchema } from '@conduction/nextcloud-vue'

const fields = fieldsFromSchema(schema, {
  exclude: ['createdAt', 'updatedAt'],
  includeReadOnly: false,
  overrides: { description: { widget: 'textarea' } },
})
```

## Parameters

| Arg | Type | Default | Description |
|-----|------|---------|-------------|
| `schema` | `object` | — | Must have a `properties` object; otherwise `[]`. |
| `options.exclude` | `string[]` | `[]` | Keys to drop. |
| `options.include` | `string[] \| null` | `null` | Whitelist. |
| `options.overrides` | `object` | `{}` | Per-key overrides merged onto the descriptor. |
| `options.includeReadOnly` | `boolean` | `false` | When `false`, properties with `readOnly: true` are dropped. |

## Returns

```ts
{
  key: string,
  label: string,          // prop.title ?? key
  description: string,    // prop.description ?? ''
  type: string,           // prop.type ?? 'string'
  format: string | null,
  widget: string,         // resolved — see table below
  required: boolean,      // derived from schema.required
  readOnly: boolean,
  default: any | null,    // prop.default ?? null
  enum: any[] | null,
  items: object | null,
  validation: {
    minLength, maxLength, minimum, maximum, pattern
  },
  order: number,          // prop.order ?? Infinity
}[]
```

## Widget resolution

The `widget` field is resolved by the internal `resolveWidget()` routine with this precedence:

1. `prop.widget` — explicit hint, pass-through (custom widgets supported).
2. `prop.enum` → `'select'`.
3. Type-based:
   - `boolean` → `'checkbox'`
   - `integer` / `number` → `'number'`
   - `array` + `items.enum` → `'multiselect'`
   - `array` (no enum) → `'tags'`
4. Format-based:
   - `date-time` → `'datetime'`
   - `date` → `'date'`
   - `email` → `'email'`
   - `uri` / `url` → `'url'`
   - `markdown` / `textarea` → `'textarea'`
5. `prop.maxLength > 255` → `'textarea'`.
6. Fallback → `'text'`.

## Filtering

Properties are dropped when:

- `prop.visible === false`
- `prop.readOnly === true` and `includeReadOnly !== true`
- key in `exclude`, or not in `include` (when provided)
- `prop.type === 'object'` **unless** `prop.widget` is set (auto-forms don't render nested objects by default; set `widget: 'json'` or `widget: 'code'` to opt an object property back in and let `CnFormDialog` render a `CnJsonViewer` for it).

## Sorting

Same as the other schema helpers: `prop.order` ascending, alphabetical tie-break.

## Related

- [CnFormDialog](../components/cn-form-dialog.md) — Primary consumer.
- [columnsFromSchema](./columns-from-schema.md), [filtersFromSchema](./filters-from-schema.md)
