# isLockedByCurrentUser

```js
import { isLockedByCurrentUser } from '@conduction/nextcloud-vue'

if (isLockedByCurrentUser(record)) { /* offer to release it */ }
```

`boolean` — whether the lock belongs to the current user.

Compares against the **uid**, never the display name. Two people can share a display name, and a false positive here is the dangerous direction: it would present someone else's lock as your own and offer an Unlock button for it.

Returns `false` when there is no session (a public page), for the same reason.

Accepts both a record carrying `@self` and a flattened one.

See [objectLock](./object-lock.md) for the full family.
