# objectLock

One reading of "is this record locked, and by whom", for code that has a record **already in hand**.

```js
import {
  resolveObjectLock,
  isObjectLocked,
  isLockedByCurrentUser,
  lockHolder,
  readLockPayload,
} from '@conduction/nextcloud-vue'
```

## Why these exist

The lock lives in `@self.locked` as `{ user, displayName?, expiresAt? }`, and the only thing that knew how to read it was [`useObjectLock`](./composables/use-object-lock.md) — a composable that takes an object store, a register, a schema and an id, and subscribes.

That shape is right for a detail page holding one record and wrong for every list: a card grid rendering forty rows cannot mount forty subscriptions to find out which of them carry a padlock. So the lists showed nothing, and a locked record was indistinguishable from an unlocked one until you opened it and tried to save.

These helpers take no store, make no request, and open no subscription — which is exactly what a row renderer can afford.

## The expiry rule

**An expired lock is not a lock.** The server does not sweep expired locks; expiry is evaluated on read. A caller that only checks for the key's presence marks stale locks as live, painting padlocks on records anyone may edit — which trains people to ignore the padlock.

Every function here applies that rule. Do not re-implement it per call site.

## API

### `resolveObjectLock(object)`

The whole state, resolved once. Preferred over calling the individual helpers in sequence, since each of those reads the payload again.

```js
const { locked, byMe, holder, expiresAt } = resolveObjectLock(record)
```

| Key | Type | Description |
|-----|------|-------------|
| `locked` | `boolean` | Whether an unexpired lock is held. |
| `byMe` | `boolean` | Whether the current user holds it. |
| `holder` | `string \| null` | Display name, falling back to uid. |
| `expiresAt` | `Date \| null` | When the lock lapses. |

An expired lock resolves to exactly the same shape as no lock at all.

### `isObjectLocked(object)`

`boolean` — whether an unexpired lock is held.

### `isLockedByCurrentUser(object)`

`boolean` — whether the lock belongs to the current user.

Compares against the **uid**, never the display name: two people can share a display name, and a false positive here is the dangerous direction — it would present someone else's lock as your own and offer an Unlock button for it. Returns `false` when there is no session (a public page), for the same reason.

### `lockHolder(object)`

`string | null` — who holds the lock, as something you can print. Prefers `displayName`, falls back to `user`.

### `readLockPayload(object)`

`object | null` — the raw `@self.locked` block, with **no** expiry rule applied. Use this only when you need the stored value itself; prefer `resolveObjectLock` everywhere else.

## Envelope shapes

All of these accept both a record carrying `@self` and a flattened one where the metadata sits at the top level. Both occur: the object store holds the former, several widget props pass the latter.

## See also

- [`CnLockIndicator`](../components/cn-lock-indicator.md) — the padlock these drive in lists, cards and tables
- [`CnLockedBanner`](../components/cn-locked-banner.md) — the card on the detail page
- [`useObjectLock`](./composables/use-object-lock.md) — the composable that *acquires* and *releases* a lock, and keeps it fresh
