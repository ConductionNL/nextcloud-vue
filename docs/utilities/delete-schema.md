# deleteSchema

Delete an OpenRegister schema.

```js
import { deleteSchema, SchemaHasObjectsError } from '@conduction/nextcloud-vue'

try {
    await deleteSchema(id)
} catch (e) {
    if (e instanceof SchemaHasObjectsError) {
        // Show e.objectCount, then cascade only if the user accepts the data loss:
        await deleteSchema(id, { deleteObjects: true })
    }
}
```

## Options

| Option | Type | Description |
|---|---|---|
| `deleteObjects` | `boolean` | Also delete the schema's objects. **Irreversible.** Never pass on the first attempt. |
| `headers` | `object` | Request headers. |

Throws [`SchemaHasObjectsError`](./schema-has-objects-error.md) when objects still use the schema and no cascade was requested. It is deliberately **not** thrown once `deleteObjects` was already sent, so a caller cannot re-prompt forever against a server that keeps refusing.

Never sends `force` — that deletes the schema while orphaning its objects and their table.

See also: [`saveSchema`](./save-schema.md).
