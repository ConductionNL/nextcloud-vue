# Design: Multi-Tenancy Context

## Reuse analysis

- `src/utils/headers.js::buildHeaders()` is the single point of
  outbound-header construction; we extend it rather than introducing
  parallel builders.
- `src/store/useObjectStore.js::createObjectStore()` is the
  established factory; we add an optional config field rather than
  introducing a parallel store.
- Vue 3's `inject`/`provide` is the canonical Composition-API
  context pattern — same model as the existing `useAppManifest`
  (consumed by `CnAppRoot`).
- `Organisation` entity is already typed in
  `src/types/organisation.d.ts`; no new entity.
- `CnAppRoot`'s top-bar already has slot architecture; we add the
  badge as a new slot consumer rather than rewriting the layout.

## Composable contract

```js
// src/composables/useTenantContext.js
import { ref, provide, inject } from 'vue'

const TENANT_CONTEXT_KEY = Symbol('tenantContext')

export function provideTenantContext({
    initialOrganisationUuid = null,
    organisationsLoader = null,
} = {}) {
    const activeOrganisationUuid = ref(initialOrganisationUuid)
    const activeOrganisation = ref(null)
    const tenantSwitchListeners = []

    function setActiveTenant(uuid) {
        const previous = activeOrganisationUuid.value
        if (previous === uuid) return
        activeOrganisationUuid.value = uuid
        // Async-load the Organisation entity if a loader is wired
        if (organisationsLoader) {
            organisationsLoader(uuid).then(org => {
                activeOrganisation.value = org
            })
        }
        for (const listener of tenantSwitchListeners) {
            listener({ previous, current: uuid })
        }
    }

    function onTenantSwitch(listener) {
        tenantSwitchListeners.push(listener)
        return () => {
            const i = tenantSwitchListeners.indexOf(listener)
            if (i >= 0) tenantSwitchListeners.splice(i, 1)
        }
    }

    const ctx = {
        activeOrganisationUuid,
        activeOrganisation,
        setActiveTenant,
        onTenantSwitch,
    }
    provide(TENANT_CONTEXT_KEY, ctx)
    return ctx
}

export function useTenantContext() {
    const ctx = inject(TENANT_CONTEXT_KEY, null)
    if (!ctx) {
        throw new Error('useTenantContext must be called inside a provideTenantContext tree')
    }
    return ctx
}
```

## Store integration shape

```js
// In a consumer app's store wiring:
import { ref } from 'vue'
import { createObjectStore, filesPlugin, auditTrailsPlugin } from '@conduction/nextcloud-vue'

const tenantUuid = ref(null)  // wired to useTenantContext().activeOrganisationUuid

export const useObjectStore = createObjectStore('myApp.objects', {
    plugins: [filesPlugin(), auditTrailsPlugin()],
    organisationUuidGetter: () => tenantUuid.value,
})
```

When the store factory builds an action that issues an HTTP request,
it calls:

```js
const headers = buildHeaders({
    organisationUuid: this.organisationUuidGetter?.(),
})
```

`buildHeaders` returns the existing CSRF + OCS-APIREQUEST headers
plus, when the organisation is non-null,
`'X-OpenRegister-Organisation': uuid`.

## Cache invalidation

The store's internal `collections` and `objects` caches are keyed
implicitly by request URL today. With multi-tenancy, the cache MUST
be flushed when the tenant changes. Two implementations:

**Option A (simple)**: `setActiveTenantOrganisation(uuid)` clears
both caches unconditionally.

**Option B (precise)**: Cache key includes the organisation UUID;
post-switch, lookups miss → fresh fetch → old keys garbage-collect
on next eviction.

Picked **A** for simplicity. Tenant switches are rare events; the
cost of refetching is bounded; cache-key plumbing per plugin would
double the maintenance surface.

## Header validation strategy

`X-OpenRegister-Organisation` is informational on the FE side. The
FE always stamps; the server-side OR change (sibling
`multi-tenancy-header-validation`) decides what to do with it:

- **Default behaviour**: server compares header to session-resolved
  active org. On mismatch, server stamps with the session value AND
  emits a `X-OpenRegister-Organisation-Mismatch: 1` response header.
  Client logs a warning and may surface to the user.
- **Strict mode** (opt-in via app-config
  `strict_organisation_header_validation = true`): mismatch returns
  `409 Conflict` with structured error.

Strict mode is for hardened deployments where multi-tab races are
considered security-relevant.

## Why a composable, not a Pinia store

A Pinia tenant store would couple every consumer to Pinia. The
composable pattern works for both Composition-API and Options-API
consumers (via the mixin), and provides a tighter "tenant context is
provided once at the app root" contract. Apps that want to put the
tenant in a Pinia store can — the composable is orthogonal.

## Open design questions

1. **Should the header name be `X-OpenRegister-Organisation` or
   `X-OR-Organisation` (shorter)?** Picked the longer form for
   discoverability; HTTP header verbosity is rarely a perf concern.
2. **Should `setActiveTenant` reload the page or stay in-app?** Stay
   in-app. A page reload defeats the point of having a composable;
   the cache-clear + refetch is the correct approach. Apps that
   prefer reload can hook the `tenantSwitch` event.
3. **What happens when context is missing?** `useTenantContext()`
   throws if no `provideTenantContext()` is in the tree. This forces
   apps to wire it explicitly — adopting multi-tenancy is opt-in but
   intentional, not silently no-op.
4. **Single-org auto-detect**: should `CnTenantBadge` auto-set the
   tenant when the user only has one org? Yes — `setActiveTenant` is
   called once on mount with the single org's UUID; the badge then
   hides itself. This is the zero-config single-tenant experience.
