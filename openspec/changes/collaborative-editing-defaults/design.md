# Design: collaborative-editing-defaults

## Component dependencies

```
CnDetailPage
├─ useObjectSubscription(register, schema, id)
│  └─ objectStore.subscribe(type, id) (plugin already shipped)
│     └─ liveUpdatesPlugin → notify_push WebSocket
│
└─ useObjectLock(register, schema, id, { autoRenew })
   ├─ POST   /api/objects/{register}/{schema}/{id}/lock
   ├─ DELETE /api/objects/{register}/{schema}/{id}/lock
   └─ READ   objectStore.objects[type][id]['@self'].locked  ← reactive

CnObjectSidebar (mirrors CnDetailPage)
CnLockedBanner   (presentation-only; receives `lock` state)
```

`useObjectLock` does NOT poll the lock endpoint. The lock state comes from the same store cache that `liveUpdatesPlugin` keeps fresh — when user B locks, OR fires `or-object-{uuid}` with `action: update` and the cache refetches the object whose `@self.locked` is now populated. User A's `useObjectLock` re-reads the cache via a computed.

This means: **without `useObjectSubscription`, `useObjectLock` cannot detect remote lock acquisitions in real time**. We make this explicit in the JSDoc; if a consumer disables subscriptions but enables lock, we emit a one-time `console.warn`.

## Lifecycle

```
mounted()
  ├─ useObjectSubscription
  │   └─ objectStore.subscribe(type, id)        ← idempotent
  │
  └─ user clicks Edit
      └─ useObjectLock.acquire()
         ├─ POST .../lock { duration: 1800 }
         ├─ on 200 → state.locked=true, state.lockedByMe=true
         ├─ on 409/423 → throws LockConflictError; UI shows banner
         └─ start renew interval (10 min)

beforeDestroy()
  ├─ if locked && lockedByMe → release() (DELETE .../lock)
  └─ subscribe handle auto-cleaned via tryOnScopeDispose

window.beforeunload (browser close)
  └─ navigator.sendBeacon(DELETE .../lock)      ← best-effort
```

## Manifest opt-out

```json
{
  "id": "MeetingDetail",
  "route": "/meetings/:id",
  "type": "detail",
  "config": {
    "register": "decidesk",
    "schema": "meeting",
    "subscribe": true,            // default true; set false to disable auto-subscribe
    "lock": true                  // default true; set false to disable lock-on-edit
  }
}
```

`subscribe` and `lock` are sibling Booleans on `pages[].config`. Schema gets two new optional `boolean` properties on the existing config object (`additionalProperties: true` already, so the change is purely a `properties` extension).

## Failure modes & UX

| Failure | Detection | UX |
|---|---|---|
| `notify_push` unreachable | `liveUpdatesPlugin` falls back to polling | Subscriptions still work, just slower (transport-agnostic) |
| Lock POST 401/403 | `useObjectLock.acquire()` rejects with `PermissionError` | Toast: "You don't have permission to lock; concurrent edits aren't blocked." Edit mode still allowed. |
| Lock POST 409 (someone else holds) | rejects with `LockConflictError` | Banner: "Locked by <displayName> until <expiresAt>." Edit toggle disabled. |
| Network failure on release | beforeunload sendBeacon best-effort; falls back to OR's TTL expiry (30 min default) | Lock auto-expires; no UX impact. |
| Lock acquired but user inactive | renew interval skipped while document hidden | Lock TTL elapses; on next focus, `acquire()` re-runs. |

## Why default-on, not opt-in

Every consumer that uses `CnDetailPage` today wants both behaviours — they just haven't built them. Making this opt-out means:

- **No per-app migration.** Apps inherit the right semantics on next lib bump.
- **One source of truth.** The "should I subscribe?" decision lives in one file (`CnDetailPage.vue`), not 6 consumer apps.
- **Edge cases stay opt-out.** Read-only audit pages set `subscribe: false`. Bulk-edit scripts set `lock: false` and use the API directly.

## Test plan summary

- Unit: each composable in isolation (mocked `objectStore`, mocked axios).
- Integration: `CnDetailPage.spec.js` covers (a) auto-subscribe fires once on mount, (b) edit toggle calls acquire, (c) banner renders on 409, (d) cleanup releases on unmount.
- E2E: two-browser test on decidesk (browser A locks → browser B's edit button disables within 2s).

## Risks

1. **Lock + subscribe coupling.** As noted, lock state arrives via subscribe. If consumers opt out of subscribe but keep lock, remote locks are invisible until they POST. The console.warn explains, but a future cycle should make `useObjectLock` self-fetch on a longer interval as fallback.
2. **Auto-renew complexity.** Visibility gating means a user who tabs away for 10 min loses the lock. We document this; the alternative ("renew forever") is worse (zombie locks).
3. **Permission heterogeneity.** Some orgs disable lock entirely. We detect via the first `acquire()` rejection and don't keep retrying.
