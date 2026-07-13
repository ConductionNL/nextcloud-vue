# SchemaHasObjectsError

Thrown by [`deleteSchema`](./delete-schema.md) when objects still use the schema, so deleting it would orphan them.

```js
import { deleteSchema, SchemaHasObjectsError } from '@conduction/nextcloud-vue'

try {
    await deleteSchema(id)
} catch (e) {
    if (e instanceof SchemaHasObjectsError) {
        // "Cow still has 3 objects. Delete the schema and its objects?"
        console.log(e.objectCount)
    }
}
```

| Property | Type | Description |
|---|---|---|
| `objectCount` | `number` | How many objects would be orphaned. |

A **question for the user**, not a fault: show `objectCount`, then re-call `deleteSchema` with `deleteObjects: true` only if they accept the permanent data loss.

It is deliberately **not** thrown once the cascade was already requested — so a caller cannot re-prompt forever against a server that keeps refusing.
