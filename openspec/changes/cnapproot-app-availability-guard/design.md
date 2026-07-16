# Design: CnAppRoot app-availability guard

## Reuse analysis

- `CnAppRoot` already has a phase machine
  (loading → dependency-missing → shell) and a `provide()` /
  `inject` plumbing layer. This change adds one new phase
  (capabilities-loading) ahead of the existing three plus one
  new render branch (or-missing) parallel to dependency-missing —
  no new component shells.
- `@nextcloud/capabilities` is already used by
  `src/composables/useAppStatus.js` for the secondary check.
  CnAppRoot reuses the same import; no new dependency. The
  package moves from `dependencies` to `peerDependencies` to
  match the rest of the `@nextcloud/*` family — it's a Nextcloud
  bootstrap module, not a library-specific runtime dep, and apps
  always pull it in via `@nextcloud/vue`'s peer chain.
- `NcEmptyContent` and `NcLoadingIcon` are already imported
  across the library (CnFilesPage, CnStatsBlock, CnChatPage).
  CnAppRoot pulls them from the same `@nextcloud/vue` barrel.

## Why the guard runs ABOVE the existing phases

Sequence:

1. **`requiresApps` capability check** (new) — runs first because
   `manifest.dependencies` and the rest of the shell assume
   OpenRegister is present. If OR is missing, the renderer never
   even gets to the loading phase; we'd otherwise mount the
   manifest fetcher, error out on the first OR call, and surface
   a less actionable "fetch failed" screen.
2. **`isLoading`** (existing) — manifest still loading.
3. **`unresolvedDependencies`** (existing) — manifest's declared
   dependencies missing.
4. **Shell** (existing) — render the consumer's app.

## Why default `['openregister']` rather than empty

Two strategies were considered:

### Strategy A — opt-in, default `[]` (REJECTED)

Apps add `:requires-apps="['openregister']"` explicitly. Pros:
back-compat, no surprise. Cons: every fleet app has to remember
to add it; the library knowledge ("OR is the foundation") leaks
to the consumer; new apps risk shipping without the guard.

### Strategy B — always-on, default `['openregister']` (CHOSEN)

The library encodes the convention. Pros: zero per-app work, no
drift, new apps get it for free. Cons: apps that genuinely don't
need OR (the styleguide, the docs site) must opt out — but
that's exactly one line, and the deviation is loud at the
consumer site.

The choice fits the user-locked direction ("long-term-app feature
decisions favor unification"): one write path, one shared
abstraction.

## Why `#or-missing` is a scoped slot, not just a slot

Consumer apps that override the default empty-state often need
the missing-apps list to render context-specific copy ("this
feature needs OpenRegister + openconnector — install the
following:"). Passing `{ missingApps }` to the slot scope keeps
the consumer-side template declarative without forcing them to
re-derive the missing list from props.

## Why one-shot, not reactive

The `OC.appswebroots` global and the capabilities bootstrap are
populated once at page load by Nextcloud. They don't change while
the user is on the page (installing an app reloads). A reactive
re-check on every navigation would burn a request per route
change for no signal gain. One mount-time check, cached on the
component instance, is sufficient.

## Why fall through on network failure

When `getCapabilities()` rejects, the renderer mounts. Three
reasons:

1. Capabilities API failures are rare and almost always
   indicative of a different problem (CORS, IP block, admin
   policy). Hiding the entire app behind an "OR missing" screen
   for a CORS bug is a worse UX than letting the data layer
   surface the actual failure.
2. The same fallback pattern already lives in `useAppStatus.js`
   (`try { … } catch(err) { console.warn(…) }` — install/enable
   default false but the caller decides). CnAppRoot mirrors that
   posture: warn, don't block.
3. Consumer apps that need stricter guarantees can override
   `#or-missing` and run their own check inside the slot.

## Loading-state design

The check is fast in practice (capabilities API is cached by
NC's bootstrap). On a cold cache the round-trip is ~50 ms. The
loading phase shows a thin centered `<NcLoadingIcon :size="32" />`
to avoid the "flash of renderer → flash of empty state" on slow
connections.

## Alternative: read `OC.appswebroots` synchronously

Considered using the same primary check as `useAppStatus.js` —
read `OC.appswebroots[appId]` synchronously, no async needed.
Rejected because:

- The user explicitly locked the design on capabilities API.
- The capabilities API surfaces both install AND enable + per-user
  permission state in one bootstrap, which is the right contract
  for "can this user use OpenRegister right now" — broader than
  appswebroots' "is this app enabled site-wide".
- Apps that implement `ICapability` (which OpenRegister does)
  surface in capabilities bootstrap reliably.

The async indirection is small (one mount-time `await`); the
contract gain is real.

## Why move `@nextcloud/capabilities` from `dependencies` to `peerDependencies`

Every other `@nextcloud/*` runtime module in the library is a
peer dep:

```
@nextcloud/axios     — peer
@nextcloud/l10n      — peer
@nextcloud/router    — peer
@nextcloud/vue       — peer
```

`@nextcloud/capabilities` is the same kind of thing — a thin
bootstrap accessor over a global that Nextcloud injects on every
authenticated page. Hosting apps already pull it in transitively
via `@nextcloud/vue`. Listing it as a runtime dep risks duplicate
copies in the bundle; listing it as a peer matches the rest of
the family and keeps the bundle clean.

## i18n strings

The empty-state default copy uses the consumer-app `t()` function
provided via the `translate` prop (which CnAppRoot already
provides as `cnTranslate`). The keys:

- `app-availability.title` — "OpenRegister is required"
- `app-availability.description` — "This app stores its data in
  OpenRegister. Install or enable OpenRegister from the Nextcloud
  app store to continue."
- `app-availability.action` — "Open app store"

Apps that haven't supplied translations for these keys see the
key string verbatim — visible enough to flag the missing
translation but not crash-y.

## Testing strategy

Mocks:

- `@nextcloud/capabilities` is already mocked at the top of
  `tests/components/CnAppRoot.spec.js` (existing tests rely on
  it for the dependency-missing path through `useAppStatus`).
  The new tests reuse the same mock.
- The `__mocks__/nextcloud-vue.js` stub already exposes
  `NcEmptyContent` and `NcLoadingIcon`.
- For the network-failure case, `getCapabilities.mockImplementation(() => { throw new Error('boom') })`
  exercises the try/catch fallthrough.
- Loading state is asserted before `await wrapper.vm.$nextTick()`
  (or `flushPromises`) — the spinner is visible during the
  in-flight phase, the renderer/empty-state replaces it after.

## Out of scope

- Switching the existing `manifest.dependencies` machinery to
  also use the capabilities API. That path uses
  `OC.appswebroots` first, capabilities second; changing it would
  ripple through every app that declares `dependencies` in its
  manifest. The two paths coexist cleanly.
- Adding a `requiresFeatures` prop. Capabilities-API checks
  whether an app is available; feature-flagging is a runtime
  concern.
- Migrating consumer apps. Follow-up PR per consumer.
