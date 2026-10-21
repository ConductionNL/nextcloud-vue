# runObjectAction

Run one declared action on one object, as the person: `POST /apps/openregister/api/objects/{register}/{schema}/{id}/actions/{action}` with `{ inputs }`.

```js
import { runObjectAction } from '@conduction/nextcloud-vue'

const result = await runObjectAction({ register: 'zaken', schema: 'case', id }, 'publish', { from: '2026-11-01' })
if (!result.ok) {
	showError(result.message)
}
```

| Param | Type | Description |
|-------|------|-------------|
| `target` | `{ register, schema, id }` | Where the object lives. |
| `key` | `string` | The action key. |
| `inputs` | `object` | The collected inputs. |

Empty optional inputs are not sent, so OpenRegister applies the declared default (`@now`, `@user`, `@object.<path>`).

The result never throws:

| Answer | Result |
|--------|--------|
| 200 | `{ ok: true, status: 'completed', run, outcome, next, object }` (`ok: false, status: 'failed'` when the outcome is `failed`) |
| 202 | `{ ok: true, status: 'queued' | 'suspended', run }` |
| 404, 403 | `{ ok: false, httpStatus, message }` |
| 409 | `{ ok: false, error: 'action-precondition-unmet', message }` with the declared reason |
| 422 | `{ ok: false, message, fieldErrors }` naming the refused inputs |

Next: follow an async run with [`useObjectActions`](composables/use-object-actions.md), which reads `/api/flow-runs/{uuid}` until the run ends.
