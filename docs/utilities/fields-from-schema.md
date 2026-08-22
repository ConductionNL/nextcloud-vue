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
| `options.overrides` | `object` | `{}` | Per-key overrides merged onto the descriptor. A `{ readOnly: false }` override on a schema-`readOnly` key also **un-skips** it (surfacing a single read-only field as editable — e.g. a denormalised name editable only on create — without flipping the whole form to `includeReadOnly`). |
| `options.includeReadOnly` | `boolean` | `false` | When `false`, properties with `readOnly: true` are dropped (except a key whose override sets `readOnly: false`). |
| `options.translate` | `(text: string) => string` | — | Display-layer translation applied to each field's `label` and `description`. Schema titles/descriptions are authored in English as the canonical source; pass your bound `t()` (via the injected `cnTranslate`) so the rendered label follows the user's language. Omitted leaves the English source strings unchanged. |

## Returns

```ts
{
  key: string,
  label: string,          // prop.title ?? key
  description: string,      // inline helper text — see "Long descriptions"
  descriptionLong: string,  // full text when it was split off, else ''
  type: string,           // prop.type ?? 'string'
  format: string | null,
  widget: string,         // resolved — see table below
  required: boolean,      // derived from schema.required
  readOnly: boolean,
  default: any | null,    // prop.default ?? null
  enum: any[] | null,
  enumLabels: object | null,  // prop['x-enum-labels'] — raw enum value -> English display label
  items: object | null,
  validation: {
    minLength, maxLength, minimum, maximum, pattern
  },
  order: number,          // prop.order ?? Infinity
}[]
```

## Long descriptions

Most schema descriptions are a single line (`"Human-readable name"`) and pass
through to `description` untouched, with `descriptionLong` left as `''`.

Some are not. A property documenting, say, every adapter type a value dispatches
to can run to well over a thousand characters — rendered inline it dwarfs the
field it belongs to and pushes the rest of the form off screen. Descriptions
longer than 120 characters are therefore split:

- `description` — the first sentence when that alone fits within the limit,
  otherwise a word-boundary-clamped prefix ending in `…`.
- `descriptionLong` — the complete original text.

`CnFormDialog` renders `description` as the helper line under the input and, when
`descriptionLong` is set, adds an ⓘ button that reveals the full text in a
popover. Consumers rendering their own fields (via the `#form-fields` or
`#field-<key>` slots) get both values on the field descriptor and should follow
the same pattern.

The splitter skips abbreviations (`e.g.`, `i.e.`, `etc.`) and single-letter
initials when looking for the first sentence boundary, so a description opening
with `"Base URL, e.g. https://…"` is not cut after `e.g.`.

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
