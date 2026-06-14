# Composables — `useObjectSubscription` + `useObjectLock`

## ADDED Requirements

### Requirement: REQ-CO-LOCK-001 — `useObjectSubscription` lifecycle

The composable `useObjectSubscription(register, schema, id, options?)` MUST register a subscription on `objectStore` when called inside a Vue component `setup()` (or any active effect scope) AND MUST tear that subscription down via `tryOnScopeDispose`.

**Signature:** `useObjectSubscription(register, schema, id, options?: { enabled?: boolean | Ref<boolean> })`

**Returns:** `{ status: Ref<'connecting'|'open'|'closed'>, lastEventAt: Ref<Date|null> }`

#### Scenario: Subscribes on mount, unsubscribes on unmount

- GIVEN a component calls `useObjectSubscription('decidesk', 'meeting', 'uuid-1')` in `setup()`
- WHEN the component mounts
- THEN `objectStore.subscribe('meeting', 'uuid-1')` MUST be called exactly once
- WHEN the component unmounts
- THEN `objectStore.unsubscribe(handle)` MUST be called exactly once with the handle returned by the subscribe call

#### Scenario: Reactive `enabled` flag toggles subscription

- GIVEN `useObjectSubscription('decidesk', 'meeting', 'uuid-1', { enabled: ref(false) })`
- WHEN the ref flips to `true`
- THEN `subscribe` MUST be called
- WHEN the ref flips back to `false`
- THEN `unsubscribe` MUST be called for the previously-acquired handle

#### Scenario: `id` ref changes mid-mount

- GIVEN a component holds a reactive `id` (e.g. from `$route.params.id`) and calls `useObjectSubscription('decidesk', 'meeting', idRef)`
- WHEN `idRef.value` changes from `'uuid-1'` to `'uuid-2'`
- THEN the previous subscription MUST be released
- AND a new subscription MUST be acquired for `'uuid-2'`

---

### Requirement: REQ-CO-LOCK-002 — `useObjectLock` reactive state from store cache

The composable `useObjectLock(register, schema, id, options?)` MUST derive its `locked`, `lockedByMe`, `lockedBy`, and `expiresAt` refs from `objectStore.objects[type][id]['@self'].locked` rather than polling the lock endpoint. The composable MUST NOT issue any GET requests of its own; lock state is updated reactively when `liveUpdatesPlugin` refetches the object on `or-object-{uuid}` events.

**Signature:** `useObjectLock(register, schema, id, options?: { autoRenew?: boolean, renewIntervalMs?: number, lockDurationSec?: number })`

**Returns:** `{ locked: ComputedRef<boolean>, lockedByMe: ComputedRef<boolean>, lockedBy: ComputedRef<string|null>, expiresAt: ComputedRef<Date|null>, acquire: () => Promise<void>, release: () => Promise<void> }`

#### Scenario: Reads lock state from store cache

- GIVEN `objectStore.objects.meeting['uuid-1']['@self'].locked = { user: 'alice', expiresAt: '2026-05-10T15:00:00Z' }`
- WHEN a component reads `useObjectLock('decidesk', 'meeting', 'uuid-1').locked`
- THEN `locked.value` MUST be `true`
- AND `lockedBy.value` MUST be `'alice'`
- AND `expiresAt.value` MUST be a `Date` matching `2026-05-10T15:00:00Z`

#### Scenario: `lockedByMe` reflects current user

- GIVEN the current Nextcloud user is `alice` (per `OC.getCurrentUser()`)
- AND the cached object is locked by `alice`
- WHEN `lockedByMe.value` is read
- THEN it MUST be `true`

#### Scenario: Live update flips `locked` without explicit refetch

- GIVEN a component is mounted with `useObjectLock('decidesk', 'meeting', 'uuid-1')`
- AND no lock is held initially (`locked.value === false`)
- WHEN user B's lock POST elsewhere fires `or-object-{uuid-1}` and `liveUpdatesPlugin` refetches the object
- THEN within one Vue tick `locked.value` MUST be `true`
- AND `useObjectLock` MUST NOT have issued any HTTP requests of its own

---

### Requirement: REQ-CO-LOCK-003 — `useObjectLock.acquire()` semantics

`acquire()` MUST `POST /api/objects/{register}/{schema}/{id}/lock` with body `{ duration: lockDurationSec }`. It MUST resolve when the lock is held by the current user; reject with a typed `LockConflictError` on HTTP 409/423; reject with a typed `PermissionError` on 401/403; reject with the underlying transport error otherwise.

#### Scenario: Successful acquire

- GIVEN the object is unlocked
- WHEN `acquire()` is called
- THEN a POST is issued
- AND on 200 response, the promise resolves
- AND the next read of `lockedByMe.value` MUST be `true`

#### Scenario: Conflict throws typed error

- GIVEN user B already holds the lock
- WHEN `acquire()` is called
- THEN the POST returns 409 (or 423 — both are spec-equivalent)
- AND the promise rejects with an instance of `LockConflictError`
- AND `error.lockedBy` MUST be set to user B's displayName

#### Scenario: Auto-renew while editing

- GIVEN `useObjectLock(..., { autoRenew: true, renewIntervalMs: 600000 })` and a successful `acquire()`
- WHEN 10 minutes pass with the document visible
- THEN a renew POST MUST be issued (idempotent re-`acquire`)
- WHEN the document becomes hidden (visibilityState=hidden)
- THEN no renew POST MUST be issued until the document becomes visible again

---

### Requirement: REQ-CO-LOCK-004 — Auto-release on unmount and beforeunload

`useObjectLock` MUST call `release()` when the component scope is disposed (via `tryOnScopeDispose`) AND MUST register a `window.beforeunload` listener that issues a `navigator.sendBeacon` DELETE to the lock endpoint as a best-effort fallback.

#### Scenario: Component unmount releases the lock

- GIVEN `acquire()` was called and the lock is held by the current user
- WHEN the component unmounts (scope disposed)
- THEN a DELETE is issued to the lock endpoint
- AND `lockedByMe.value` MUST become `false`

#### Scenario: Tab close best-effort release

- GIVEN the lock is held
- WHEN the user closes the browser tab
- THEN `navigator.sendBeacon` MUST be invoked with the lock-release URL
- AND if the beacon fails, the lock MUST still expire via the OR-side TTL (30 min default; configured via `lockDurationSec`)
