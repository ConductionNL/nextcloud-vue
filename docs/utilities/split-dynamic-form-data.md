# splitDynamicFormData

Separates a confirmed form payload into the object's own fields and the answers to its data-driven questions. See [fields the data decides](dynamic-form-fields.md) for the mechanism.

```js
import { splitDynamicFormData } from '@conduction/nextcloud-vue'

const { base, answers } = splitDynamicFormData(formData)
// base    → { title: 'Aanvraag', caseType: 'ct-1' }
// answers → [{ definitionId: 'def-1', value: 50000 }]
```

The two halves cannot go out in one call: a value row references the parent object, so the parent must be saved first. Mixing them also posts keys the parent schema does not declare, and OpenRegister drops those silently. An unsplit payload therefore loses every answer with a 200 and no error anywhere.

| Param | Type | Description |
|-------|------|-------------|
| `formData` | `object` | The dialog's confirmed payload. A missing or null value is treated as empty. |

Returns `{ base, answers }`. `base` holds the object's own fields; `answers` holds one `{ definitionId, value }` per data-driven field, and is empty for the schemas that declare none.
