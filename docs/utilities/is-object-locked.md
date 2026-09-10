# isObjectLocked

```js
import { isObjectLocked } from '@conduction/nextcloud-vue'

if (isObjectLocked(record)) { /* … */ }
```

`boolean` — whether the record carries an **unexpired** lock.

The server does not sweep expired locks; expiry is evaluated on read. A caller that only checks whether `@self.locked` is present marks stale locks as live, which paints padlocks on records anyone may edit.

A lock with no `expiresAt` is held until it is released.

Accepts both a record carrying `@self` and a flattened one.

See [objectLock](./object-lock.md) for the full family, and [resolveObjectLock](./resolve-object-lock.md) when you need more than the boolean.
