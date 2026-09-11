# lockHolder

```js
import { lockHolder } from '@conduction/nextcloud-vue'

const who = lockHolder(record) // 'Bob Bakker'
```

`string | null` — who holds the lock, as something you can print. Prefers `displayName`, falls back to the uid, and returns `null` when there is no lock.

Unlike [isObjectLocked](./is-object-locked.md) this does **not** apply the expiry rule, so pair it with a locked check rather than using its return value to decide whether a lock exists.

Accepts both a record carrying `@self` and a flattened one.

See [objectLock](./object-lock.md) for the full family.
