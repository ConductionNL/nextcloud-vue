# readLockPayload

```js
import { readLockPayload } from '@conduction/nextcloud-vue'

const raw = readLockPayload(record) // { user, displayName?, expiresAt? }
```

`object | null` — the raw `@self.locked` block, with **no expiry rule applied**.

Use it only when you need the stored value itself, for instance to display when a lock was taken. For every "is this locked" decision use [resolveObjectLock](./resolve-object-lock.md) or [isObjectLocked](./is-object-locked.md), which apply the rule that an expired lock is not a lock.

Accepts both a record carrying `@self` and a flattened one.

See [objectLock](./object-lock.md) for the full family.
