# readObjectActions

The actions the person may run on one object, from `GET /apps/openregister/api/objects/{register}/{schema}/{id}/actions`. For a component that does not use [`useObjectActions`](composables/use-object-actions.md).

```js
import { readObjectActions } from '@conduction/nextcloud-vue'

const { actions, failed, unsupported } = await readObjectActions({ register: 'zaken', schema: 'case', id }, { language: 'nl' })
```

| Param | Type | Description |
|-------|------|-------------|
| `target` | `{ register, schema, id }` | Where the object lives. Nothing is read while a part is missing. |
| `options.language` | `string` | The language a label, reason or confirm text given per locale resolves in. |

Never throws. A 403 answers an empty list. A 404 sets `unsupported`, an OpenRegister without the route. Any other failure sets `failed`, so a host can tell "no actions" from "could not read".

Next: run one with [`runObjectAction`](run-object-action.md).
