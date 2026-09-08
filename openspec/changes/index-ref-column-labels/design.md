# Design: reference column labels

## Component and surface

- `CnIndexPage` columns (`src/components/CnIndexPage/`), the column object
  shape, and `CnDataTable` cell rendering.
- `src/composables/useRefLabels.js`: `resolve(register, schema, ids,
  labelField)` batched per page, cached per register and schema for the page
  lifetime, invalidated on a write reported through the workspace context.

Kind: code.

## Column shape

```json
{ "key": "case", "labelField": "title", "link": true }
```

- `labelField` names a property of the referenced schema. When absent on a
  `$ref` column, the page uses the referenced schema's declared title field,
  and only then the id.
- `link: true` renders the label as a link to the referenced object's detail
  page when the manifest declares one for that schema.
- Nested paths are allowed: `labelField: "person.displayName"`.

## Fetching

1. After a page of rows lands, collect the distinct ids per reference column.
2. Prefer `_extend` on the list request when the schema allows it; the page
   already supports `extend` config, and this change uses it first.
3. Otherwise one batched `_ids` list request per schema with `_fields` limited
   to the label field.
4. Render rows immediately with a placeholder, fill labels when the batch
   answers. No row waits for a label.

## Sorting and filtering

- Sorting a `labelField` column sorts by the label when the store supports a
  sort over an extended field; otherwise the header shows the column as
  unsortable rather than sorting by id.
- The filter facet on a reference column lists labels, values are ids.
  `quickFilters` over a reference use the same labels.

## Alternatives considered

- Denormalised display-name properties per schema (`initiatorDisplayName`):
  rejected as the general answer, they drift from the source object.
- Resolving each cell on its own: rejected, one page would issue fifty
  requests.
