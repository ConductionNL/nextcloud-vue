# SchemaBreakingChangeError

Thrown by [`saveSchema`](./save-schema.md) when OpenRegister classifies an edit as **breaking** and will not apply it until the caller acknowledges that stored objects may no longer match the schema.

```js
import { saveSchema, SchemaBreakingChangeError, describeSchemaChange } from '@conduction/nextcloud-vue'

try {
    await saveSchema(payload, { id })
} catch (e) {
    if (e instanceof SchemaBreakingChangeError) {
        e.changes.forEach((c) => console.log(describeSchemaChange(c, t)))
        // → "barn: type changed (from string to object)"
    }
}
```

| Property | Type | Description |
|---|---|---|
| `changes` | `Array<object>` | The changes the server objected to — `{ property, kind, old, new }`. Show these verbatim. |
| `breaking` | `boolean` | Always `true`. |

This is a **question for the user**, not a fault: surface `changes`, then re-call `saveSchema` with `acknowledgeBreaking: true` if they accept. Never acknowledge on their behalf.

It is deliberately **not** thrown when the attempt already carried the flag — so a caller physically cannot build an endless confirm loop.
