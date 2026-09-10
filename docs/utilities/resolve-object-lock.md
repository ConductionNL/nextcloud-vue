# resolveObjectLock

```js
import { resolveObjectLock } from '@conduction/nextcloud-vue'

const { locked, byMe, holder, expiresAt } = resolveObjectLock(record)
```

Resolves a record's whole lock state in one pass. Takes no store, makes no request, opens no subscription — so a list can call it once per row.

| Key | Type | Description |
|-----|------|-------------|
| `locked` | `boolean` | Whether an unexpired lock is held. |
| `byMe` | `boolean` | Whether the current user holds it. |
| `holder` | `string \| null` | Display name, falling back to uid. |
| `expiresAt` | `Date \| null` | When the lock lapses. |

Prefer this over calling the individual helpers in sequence: each of those re-reads the payload, and four calls per row does four times the work for one answer.

**An expired lock resolves to exactly the same shape as no lock at all** — `{ locked: false, byMe: false, holder: null, expiresAt: null }`.

Accepts both a record carrying `@self` and a flattened one.

See [objectLock](./object-lock.md) for the full rationale and the rest of the family.
