# valueRecordsFor

Builds the value-schema rows to write for one saved object. See [fields the data decides](dynamic-form-fields.md) for the mechanism.

```js
import { valueRecordsFor } from '@conduction/nextcloud-vue'

const rows = valueRecordsFor(answers, config, saved.id)
// [{ case: 'case-uuid', propertyDefinition: 'def-1', value: '50000' }]
for (const row of rows) await store.saveObject('dossiq/caseProperty', row)
```

An answer left empty writes no row. An absent row and a row holding `''` mean the same thing to every reader, and not writing it keeps the value schema free of rows that only record that someone opened the form. A non-scalar answer is serialised rather than dropped.

| Param | Type | Description |
|-------|------|-------------|
| `answers` | `Array<{definitionId: string, value: *}>` | The answers from [`splitDynamicFormData`](split-dynamic-form-data.md). |
| `config` | `object` | The `x-openregister-extends-form` block. Its `values` sub-object names the schema and the three field names. |
| `objectId` | `string` | The saved parent object's id. |

Returns one payload per row to create. Empty when the declaration names no value schema, or when there is no saved object to point at.
