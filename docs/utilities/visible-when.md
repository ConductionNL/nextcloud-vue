# visibleWhen

The shared visibility condition that header actions, detail widgets, side cards, tabs and form fields read from the manifest. `evaluateVisibleWhen(cond, ctx)` answers it asynchronously; `evaluateVisibleWhenLocal(cond, data)` answers the local mode synchronously. Both are fail-safe: an error reads `false` and hides the element.

```js
import { evaluateVisibleWhen, evaluateVisibleWhenLocal } from '@conduction/nextcloud-vue'

const shown = await evaluateVisibleWhen(action.visibleWhen, { objectId, object })
```

## Shape

`{ appInstalled?, readerGroups?, endpoint?, source?, workspace?, field?, op?, value }`, or `{ all: [...] }` / `{ any: [...] }` to combine conditions.

| Key | Meaning |
|-----|---------|
| `appInstalled` | Precondition: the named Nextcloud app is installed and enabled. |
| `readerGroups` | Precondition: the reader is in at least one listed Nextcloud group. |
| `endpoint` | GET a same-origin JSON endpoint; `field` is a dot-path into the body. |
| `source` | An OpenRegister query `{ register, schema, filter? }`; `field` into the first result, or the total. |
| `workspace` | A key of the page workspace context, read without a request. |
| `field` | Without `endpoint` or `source`: a dot-path into the caller's record. |
| `op`, `value` | The comparison (default `eq`). |

## readerGroups

```json
"visibleWhen": {
  "all": [
    { "readerGroups": ["bezwaarcommissie", "admin"] },
    { "field": "status", "op": "eq", "value": "in-deliberation" }
  ]
}
```

- On its own it is the whole condition; next to `field`, `endpoint` or `source` both must hold.
- Administrators are the `admin` group, so list it to include them.
- Until the reader's groups are known the condition reads `false`, so the element stays hidden rather than flashing. A failed lookup and a signed-out reader also read `false`.
- One cached group lookup serves every condition on the page, shared with [`isWidgetVisible`](./is-widget-visible.md) and the `@myGroups` filter token. The local evaluation reads it reactively, so a computed re-runs when the groups arrive.
- It hides a control. It is never an authorization decision: the endpoint behind the element keeps its own check.
