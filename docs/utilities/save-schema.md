# saveSchema

Create or update an OpenRegister schema.

```js
import { saveSchema, SchemaBreakingChangeError } from '@conduction/nextcloud-vue'

try {
    await saveSchema(payload, { id: schema.id })
} catch (e) {
    if (e instanceof SchemaBreakingChangeError) {
        // Show e.changes, then re-save once the user accepts:
        await saveSchema(payload, { id: schema.id, acknowledgeBreaking: true })
    }
}
```

`PUT`s when `options.id` is set, `POST`s (creates) when it is not.

## Options

| Option | Type | Description |
|---|---|---|
| `id` | `number` | Schema id. Update when set, create when omitted. |
| `acknowledgeBreaking` | `boolean` | Accept a breaking change. **Never pass this on the first attempt** — let the server object first, show the user what it objected to, and only then re-send. |
| `headers` | `object` | Request headers. |

## Why this exists

`CnSchemaFormDialog` is shared by every app that edits schemas, but it only emits a payload — each consumer used to persist it itself. The presentation was shared while the *contract* (what a 409 means, when to acknowledge) was reimplemented per app and drifted: the same breaking-change bug had to be fixed twice, and OpenRegister's own editor could not save a breaking change at all.

Throws [`SchemaBreakingChangeError`](./schema-breaking-change-error.md) when the server refuses the edit as breaking and it was not acknowledged. It is deliberately **not** thrown when the flag was already sent, so a caller cannot build an endless confirm loop.

See also: [`deleteSchema`](./delete-schema.md), [`describeSchemaChange`](./describe-schema-change.md).
