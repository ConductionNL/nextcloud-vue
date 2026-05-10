# Proposal: collaborative-editing-defaults

## Summary

Make collaborative-editing semantics the default behaviour of `@conduction/nextcloud-vue`'s detail surfaces. When a user opens a detail page or sidebar tab on an OpenRegister object, the lib MUST automatically subscribe to that object's live-update channel; when the user enters edit mode, the lib MUST acquire an OR pessimistic lock first and surface a "Locked by X" banner whenever a remote lock is active. Both behaviours are opt-out via the manifest, and both reuse infrastructure already shipped (the `liveUpdatesPlugin` from `add-live-updates-plugin`, OR's `lockObject/unlockObject` REST endpoints, the existing `or-object-{uuid}` push event).

## Motivation

We just shipped the live-updates pipeline (OR backend → notify_push → @conduction/nextcloud-vue `liveUpdatesPlugin` → store cache invalidation → reactive re-render). Decidesk's LiveMeeting page proves the round-trip — a PUT in browser A reflects in browser B's UI within a couple of seconds with no reload.

Two follow-up gaps remain, and they are universal:

1. **No detail page is auto-subscribed.** Today consumers must hand-roll `objectStore.subscribe(type, id)` in each `CnDetailPage` mount and `unsubscribe()` in `beforeDestroy`. Every consumer needs the exact same lifecycle. The right place for that lifecycle is the lib, not the consumer.
2. **No lock-on-edit.** OR has had pessimistic locks for years (`POST /api/objects/{id}/lock`, `delete` on the same path) but the lib's `CnDetailPage` ignores them. Two users editing the same object at the same time silently overwrite each other. The locked-object warning is on the roadmap (`project_locked-object-warning.md`) but never landed.

These two gaps are complementary:
- **Subscribe → see remote changes** (including remote lock state, since lock fields ride the same `or-object-{uuid}` push payload).
- **Lock on edit → block concurrent writes** (and tell every other subscriber, in real time, "I'm editing").

Together they give us "collaborative editing" semantics for free across every consumer that uses `CnDetailPage` / `CnObjectSidebar` — decidesk, mydash, opencatalogi, procest, pipelinq, openregister itself.

## Affected Projects

- [x] Project: `nextcloud-vue` — new composables, default wiring on detail components, banner UI, doc updates.
- [x] Project: `openregister` — new docs page tying push events + lock APIs together (no code).

## Scope

### In Scope

- New composable `useObjectSubscription(register, schema, id)` — wraps `objectStore.subscribe` lifecycle, auto-cleans on scope dispose, exposes `{ status, lastEventAt }` for diagnostics.
- New composable `useObjectLock(register, schema, id, options)` — wraps OR's `POST/DELETE /api/objects/{register}/{schema}/{id}/lock`; reactive `{ locked, lockedByMe, lockedBy, expiresAt, acquire, release }`; auto-renew while editing; auto-release on `beforeDestroy` + `beforeunload`.
- `CnDetailPage` auto-subscribes on mount when `register + schema + objectId` are known. Opt-out via `manifest.pages[].config.subscribe: false`.
- `CnDetailPage` edit toggle calls `acquire()` before flipping to edit mode. On 423/409, the toggle is suppressed and a "Locked by X" banner renders. Opt-out via `manifest.pages[].config.lock: false`.
- `CnObjectSidebar` mirrors the same pattern for the active sidebar tab's object.
- New banner UI: `CnLockedBanner` (small, dismissable, prefers `NcEmptyContent` aesthetic).
- OR docs: new `docs/Patterns/collaborative-editing.md` cross-linking push events + lock APIs + the lib defaults.

### Out of Scope

- Optimistic / CRDT editing (out of scope for OpenRegister generally).
- Lock UI for collection/list views (no editor; nothing to lock against).
- Server-side enforcement changes — OR already enforces locks at write time; we're just plumbing the client side.
- Per-app migration. Consumers inherit the behaviour automatically via the next lib bump.

## Approach

Implement two independent composables and wire them into the detail components by default. Both opt-out via manifest. Both rely only on infrastructure already shipped:

1. **`useObjectSubscription`** delegates to the existing `objectStore.subscribe` action (from `liveUpdatesPlugin`). The composable adds `tryOnScopeDispose` cleanup so `setup()` callers don't have to remember `unsubscribe`.
2. **`useObjectLock`** wraps the OR REST lock endpoints. It exposes `acquire()` and `release()` plus reactive lock state. The composable polls `objectStore.objects[type][id]['@self'].locked` (which is updated by `liveUpdatesPlugin` on every `or-object-{uuid}` event), so a remote lock by user B is immediately visible in user A's `locked` ref without an extra fetch.
3. **`CnDetailPage` / `CnObjectSidebar`** call both composables in their `setup()`. Edit mode is gated on `!locked || lockedByMe`. The "Locked by X" banner mounts above the form when `locked && !lockedByMe`.

The lock auto-renew runs only while the user is actively editing AND the document is visible. On `beforeunload` we issue a synchronous `navigator.sendBeacon` unlock so abandoned locks don't pin the object until TTL.

## Why Two Composables, Not One

Lock and subscribe are independent:
- A read-only viewer (audit log page) wants subscribe but not lock.
- A bulk-edit script wants lock but not subscribe.
- An archive page wants neither.

Keeping them separate lets consumers compose. The defaults in `CnDetailPage` wire both because that's the 80% case; the 20% opt-out covers the rest.

## Backwards Compatibility

- Existing consumers that already hand-rolled `objectStore.subscribe()` keep working — the lib's auto-subscribe is idempotent (the plugin dedups the same `(type, id)` pair) and uses scope-bound cleanup so duplicate handles are released together.
- Apps that don't have the `lockObject` permission see a permission-denied response on `acquire()` and silently fall back to "edit without lock" — UX-wise a small toast warns the user that concurrent edits aren't blocked. No 500.
- Apps with no `notify_push` (degraded environments) keep working: `useObjectSubscription` already falls back to the polling transport via `liveUpdatesPlugin`.

## Open Questions

- **Lock TTL default.** OR defaults to 30 minutes. Should the lib renew on a 10-minute interval? Tradeoff: longer = fewer requests; shorter = stale locks unblock sooner. Default 10 min, configurable.
- **"Locked by X" wording.** Should the banner say "Edit anyway (override)" for admins? OR's lock API has a `force` parameter; admins technically can override. Tradeoff: power vs. footgun. Default: no override button in v1; admins can release via OR's admin UI.
