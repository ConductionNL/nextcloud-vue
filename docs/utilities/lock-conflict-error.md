# LockConflictError

Thrown by [`useObjectLock().acquire()`](./composables/use-object-lock.md) when another session already holds the OpenRegister pessimistic lock (HTTP 409 / 423).

```js
import { LockConflictError } from '@conduction/nextcloud-vue'

try {
  await lock.acquire()
} catch (e) {
  if (e instanceof LockConflictError) {
    showBanner(`Locked by ${e.lockedBy} until ${e.expiresAt}`)
  } else {
    throw e
  }
}
```

`error.lockedBy` and `error.expiresAt` come from the response body and are populated when the server includes a `lock` block.
