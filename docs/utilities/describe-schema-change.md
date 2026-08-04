# describeSchemaChange

Render one entry of a [`SchemaBreakingChangeError`](./schema-breaking-change-error.md)'s `changes[]` as a line a human can read.

```js
import { describeSchemaChange } from '@conduction/nextcloud-vue'
import { translate as t } from '@nextcloud/l10n'

describeSchemaChange(
    { property: 'barn', kind: 'type_changed', old: 'string', new: 'object' },
    t,
)
// → "barn: type changed (from string to object)"
```

| Param | Type | Description |
|---|---|---|
| `change` | `object` | One change descriptor from the server. |
| `translate` | `Function` | A `t`-style translator `(app, text, vars) => string`. Optional. |

Lives in the library so every schema editor words the same refusal identically, rather than each app inventing its own phrasing for the same server response.
