# PermissionError

Thrown by [`useObjectLock`](./composables/use-object-lock.md)'s `acquire()` and `release()` when the server returns 401 / 403. Consumers usually fall back to "edit without lock" UX.

```js
import { PermissionError } from '@conduction/nextcloud-vue'

try {
  await lock.acquire()
} catch (e) {
  if (e instanceof PermissionError) {
    showToast('Concurrent edits are not blocked on this schema')
    enterEditMode()
  } else {
    throw e
  }
}
```
