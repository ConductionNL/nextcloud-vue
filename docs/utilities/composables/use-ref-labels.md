# useRefLabels

Resolves the ids of a reference column to a label field of the referenced objects, one batched request per schema. Backs the `labelField` column option of [`CnIndexPage`](../../components/cn-index-page.md).

## Signature

```js
import { useRefLabels } from '@conduction/nextcloud-vue'

const { resolve, invalidate } = useRefLabels()
const labels = await resolve('dossiq', 'case', ['id-1', 'id-2'], 'title')
// { 'id-1': 'Permit A', 'id-2': null }
```

| Function | Description |
|----------|-------------|
| `resolve(register, schema, ids, labelField)` | Returns a `{ id: label|null }` map. One request for the distinct ids not yet cached (`_ids`, `_fields`); never throws. An id that cannot be resolved maps to `null`. |
| `invalidate(register?, schema?)` | Forgets cached labels, all of them or those of one register and schema. Call after a write to a referenced object. |

The label is `labelField` (dotted paths allowed), then `title`, `name`, `@self.name`. Labels are cached per register, schema and label field for the life of the resolver.
