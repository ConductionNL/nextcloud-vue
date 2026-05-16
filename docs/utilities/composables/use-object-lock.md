# useObjectLock

Manage the OpenRegister pessimistic lock for a single object. Reactive lock state is read from the store cache (kept fresh by [`liveUpdatesPlugin`](../../store/plugins/live-updates.md)) — the composable never polls the lock endpoint on its own.

## Signature

```js
import { useObjectLock, LockConflictError, PermissionError } from '@conduction/nextcloud-vue'

const { locked, lockedByMe, lockedBy, expiresAt, acquire, release } =
  useObjectLock(objectStore, register, schema, id, options)
```

## Arguments

| Name | Type | Description |
|------|------|-------------|
| `objectStore` | `object` | Pinia store instance. |
| `register` | `string \| Ref<string>` | OR register slug. |
| `schema` | `string \| Ref<string>` | OR schema slug. |
| `id` | `string \| Ref<string>` | Object UUID. |
| `options.autoRenew` | `boolean` | Renew the lock periodically while the doc is visible. Default `true`. |
| `options.renewIntervalMs` | `number` | Renewal interval. Default 600000 (10 min). |
| `options.lockDurationSec` | `number` | Server-side TTL requested on acquire. Default 1800 (30 min). |

## Returns

| Field | Type | Description |
|-------|------|-------------|
| `locked` | `ComputedRef<boolean>` | True when any session holds the lock and it hasn't expired. |
| `lockedByMe` | `ComputedRef<boolean>` | True when the current user holds the lock. |
| `lockedBy` | `ComputedRef<string \| null>` | Username / display name of the lock holder. |
| `expiresAt` | `ComputedRef<Date \| null>` | Lock expiration. |
| `acquire()` | `() => Promise<void>` | POST the lock; resolves on 200, rejects with `LockConflictError` on 409/423 or `PermissionError` on 401/403. |
| `release()` | `() => Promise<void>` | DELETE the lock; idempotent (404 is treated as success). |

## Errors

- **`LockConflictError`** — thrown by `acquire()` when another user holds the lock. Carries `lockedBy` and `expiresAt` from the response.
- **`PermissionError`** — thrown when the user can't lock (401 / 403).

Use `instanceof` to discriminate; both are exported from the lib root.

## Lifecycle

- Auto-renew runs only while the document is visible (skips while the tab is hidden).
- On scope dispose (`tryOnScopeDispose`), if the current user holds the lock, `release()` fires asynchronously.
- `window.beforeunload` triggers a best-effort `navigator.sendBeacon` DELETE — the lock also has a server-side TTL (default 30 min) as a safety net.

## Notes

- The composable derives `locked` / `lockedByMe` / etc. from `objectStore.objects[type][id]['@self'].locked`. If you opt out of [`useObjectSubscription`](./use-object-subscription.md), remote lock acquisitions won't be visible until a manual fetch — a `console.warn` is emitted in that scenario.
- See [`CnLockedBanner`](../../components/cn-locked-banner.md) for the default "Locked by X" UI.
