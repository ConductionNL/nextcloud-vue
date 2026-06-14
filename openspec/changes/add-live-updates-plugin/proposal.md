# Proposal: add-live-updates-plugin

## Summary

Add the frontend consumer side of the OpenRegister live-updates capability to `@conduction/nextcloud-vue`. The backend (notify_push transport, per-user fan-out, event dedup, batch mode) is implemented in `openregister/feature/add-live-updates` (PR #1453). This change adds the consumer: a `useLiveUpdates` singleton plugin, `store.subscribe(type, id?)` / `store.unsubscribe(handle)` actions, in-flight fetch deduplication, a polling fallback transport, and visibility/scope cleanup.

## Motivation

All Conduction apps display OpenRegister objects. When data changes on the server — another user updates a case, an import creates new records — the frontend has no way to know unless it polls. Polling wastes resources and introduces latency; it also runs even when the tab is hidden or the user is inactive.

The OpenRegister backend now emits two `notify_push` event strings on every object lifecycle event:

- `or-object-{uuid}` — on create, update, and delete of a specific object
- `or-collection-{register-slug}-{schema-slug}` — on create and delete only (no storm from field edits)

This change wires the frontend to those events via a single-tab WebSocket connection. Components that currently poll can switch to `store.subscribe(type, id?)` and immediately react to server changes. The same call silently falls back to a visibility-gated polling interval when `notify_push` is unavailable, so the API is transport-agnostic from the consumer's perspective.

## Affected Projects

- [x] Project: `nextcloud-vue` — New plugin file, extended `useObjectStore` state/getters/actions, new `package.json` dep

## Scope

### In Scope

- `useLiveUpdates` singleton factory — one notify_push WebSocket connection per browser tab, constructed lazily
- `store.subscribe(type, id?)` action — returns a handle; auto-cleanup via `tryOnScopeDispose`
- `store.unsubscribe(handle)` action — tears down the underlying listener when refcount reaches zero
- In-flight fetch deduplication — one `fetchObject` or `fetchCollection` call per concurrent event burst
- Polling fallback transport — `setInterval`-based, coalesced, visibility-gated
- Reconnect with exponential backoff + jitter
- Diagnostic state — `store.liveStatus`, `store.liveSubscriptions`, `store.liveLastEventAt`
- `@nextcloud/notify_push` added as a runtime dependency
- `@vueuse/core` added as a **direct runtime dependency** (for `tryOnScopeDispose` and `useDocumentVisibility`). 5 of 7 consumer apps (procest, pipelinq, docudesk, mydash, larpingapp) do not depend on VueUse today; only openregister and opencatalogi do. Making it a direct dep avoids forcing 5 apps to add the dep just to consume `@conduction/nextcloud-vue`. Bundle cost of importing only `tryOnScopeDispose` and `useDocumentVisibility` is ~400 bytes gzipped via tree-shaking.

### Out of Scope

- Per-app migration to the subscription API (separate per-app changes, unblock after this ships)
- GraphQL subscription transport (future addition, same `subscribe()` API surface)
- Server-Sent Events transport (same; future option)
- Admin UI for push notification status (belongs in OpenRegister admin settings, not this library)

## Approach

Implement as a new `liveUpdatesPlugin` using the existing plugin architecture in `src/store/plugins/`. The plugin:

1. Contributes `liveStatus`, `liveSubscriptions`, `liveLastEventAt` to store state and corresponding getters.
2. Contributes `subscribe(type, id?)` and `unsubscribe(handle)` actions to the store.
3. Uses a module-level singleton (`getLiveUpdates()`) for the underlying transport so multiple store instances and components share one WebSocket.
4. Augments `fetchObject` and `fetchCollection` with in-flight dedup via `Promise` caching in a `Map`.
5. Falls back to a visibility-gated polling transport when `@nextcloud/notify_push` `listen()` returns `null`.
6. Reconnects with exponential backoff + jitter (base 1s, cap 30s, ×2 multiplier).

The `store.subscribe()` call is the only public API apps need. Internal transport selection (WebSocket vs. polling) is invisible.

## Cross-Project Dependencies

- **Backend**: OpenRegister `feature/add-live-updates` (PR #1453) — must be merged before apps can receive live events. The frontend plugin works without it (polling fallback), so it can ship independently.
- **Runtime deps**:
  - `@nextcloud/notify_push` — added as a **direct dependency** (consistent with how other `@nextcloud/*` packages are handled in this library — see `@nextcloud/capabilities`, `@nextcloud/dialogs`)
  - `@vueuse/core` — added as a **direct dependency** (5 of 7 consumer apps do not currently bundle it; making it a peer dep would force every consumer to add the dep manually). Tree-shaken; only the two composables we use ship in the bundle.

## Rollback Strategy

- All additions are additive — no existing store actions are modified (dedup is additive wrapping)
- Apps that do not call `store.subscribe()` see zero behavioural change
- Removing the plugin reverts to the pre-change polling-based approach in each app

## Decisions Made

- **Singleton per tab, not per store instance**: Multiple `createObjectStore` instances and components all share one WebSocket. The cost of the connection (one socket, ~60 bytes keepalive/30s) does not scale with the number of store instances.
- **Refcounted listeners**: Multiple components subscribing to the same event key share one underlying socket listener. The last `unsubscribe()` for a key tears down that listener; the socket stays open if other keys have active listeners.
- **`tryOnScopeDispose` for auto-cleanup**: Subscriptions created inside a Vue component lifecycle automatically unsubscribe when the component unmounts. Subscriptions created outside a component (e.g. in a store init function) are retained until explicit `unsubscribe()`.
- **Polling fallback, not error**: When `@nextcloud/notify_push` is absent or unreachable, the plugin silently routes through polling. No console warnings. No changes required in consumer code.
- **Direct dep for `@nextcloud/notify_push`**: This library owns the integration with the notify_push API. It is not a consumer-app concern. Direct dependency keeps it consistent with `@nextcloud/capabilities` and `@nextcloud/dialogs`.
- **No seed data**: This change introduces no new OpenRegister schemas.

## Open Questions

See `DEFERRED_QUESTIONS` in the parent agent response.
