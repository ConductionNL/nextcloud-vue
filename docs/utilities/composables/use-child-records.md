# useChildRecords

Load and save the child records a parent form edits as a table ([`CnChildRecordsField`](../../components/cn-child-records-field.md)).

```js
import { useChildRecords } from '@conduction/nextcloud-vue'

const { load, save } = useChildRecords({ apiBase: '/apps/openregister/api' })
const { rows, total } = await load({ register: 'shop', schema: 'order-line', parentField: 'order', parentId })
const { saved, deleted, failed } = await save({ register: 'shop', schema: 'order-line', parentField: 'order', parentId, original: rows, rows: edited })
```

| Function | Description |
|----------|-------------|
| `load(target)` | `GET /objects/{register}/{schema}?{parentField}={parentId}&_limit=50`. Returns the first page and the total. |
| `save(target)` | After the parent is saved: one `POST /bulk/{register}/{schema}/save` for new and changed rows (with `parentField` set to the parent id) and one `POST /bulk/{register}/{schema}/delete` for removed rows. Nothing is sent when nothing changed. A refused row is returned in `failed` with its reason; the call never throws. |

Children are never nested in the parent's payload. The bulk save is read for `errors` / `failed` entries (`{ index, error }`) to name refused rows.
