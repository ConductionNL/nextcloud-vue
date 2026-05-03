# Multi-Tenancy Context

## Why

OpenRegister enforces multi-tenancy at the database query layer via
`MultiTenancyTrait::applyOrganisationFilter` — every object read or
write is scoped by the active organisation taken from the user's
session. The server side is correct.

The OR-abstraction audit (R2, 2026-05-03) found the **frontend has no
tenancy primitives**. `@conduction/nextcloud-vue`'s `createObjectStore`
factory has no organisation context, no header stamping, no cache
invalidation on tenant switch. Forms render an `organisation`
async-select as a *user-selectable field*; if the form omits it, the
server stamps the active org from the session — which works only when
session and UI agree. Five critical gaps + five cosmetic gaps were
catalogued.

The result: consuming apps roll their own per-tenant logic, caches go
stale on tenant switch, and the UI has no way to surface the active
tenant to the user. This change adds frontend tenancy primitives that
mirror the server's enforcement model.

## What Changes

- Add `useTenantContext()` Vue 3 composable (Composition API) +
  Options-API equivalent that exposes the active organisation UUID,
  full Organisation entity, and a `setActiveTenant(uuid)` setter via
  inject/provide. Lives at
  `nextcloud-vue/src/composables/useTenantContext.js`.
- Extend `buildHeaders()` in `nextcloud-vue/src/utils/headers.js` to
  accept an optional organisation UUID and stamp it as
  `X-OpenRegister-Organisation: <uuid>` so the server can validate
  the header against the session-resolved active organisation. (The
  server-side validation is a separate OR change; FE always stamps
  when context is available.)
- Refactor `createObjectStore(id, { plugins, baseUrl })` →
  `createObjectStore(id, { plugins, baseUrl, organisationUuidGetter })`.
  The new optional `organisationUuidGetter` is a function returning
  the current organisation UUID (consumers wire it to
  `useTenantContext().activeOrganisationUuid` or to whatever per-app
  source they prefer).
- Add `setActiveTenantOrganisation(uuid)` action to the store's base
  action set (alongside `setObjectItem`, `setFilters`). When called,
  it MUST: (a) update the store's internal `activeOrganisation`
  state, (b) clear cached `collections` and `objects`, (c) emit a
  `tenantSwitch` event other components can subscribe to.
- Auto-invalidate the store's collections cache when
  `useTenantContext()` reports a UUID change. Implemented via a
  watcher on the composable's reactive ref; consumers don't have to
  call `setActiveTenantOrganisation` manually if they consume the
  composable.
- Pass `X-OpenRegister-Organisation` on every request originating
  from the store's plugins (`filesPlugin`, `auditTrailsPlugin`,
  `relationsPlugin`, etc.) so file uploads, audit trails, and
  relations stay tenant-aware end-to-end.
- Add `<CnTenantBadge>` component rendering the active organisation's
  name + icon, suitable for `CnAppRoot`'s top bar. Auto-hides when
  the user has only one organisation.
- Update `CnIndexPage` to accept an optional `:active-organisation`
  prop and watch it; on change, call `store.setActiveTenantOrganisation`.
- Update `CnFormDialog` and `CnAdvancedFormDialog` to auto-fill an
  `organisation` schema field with `useTenantContext().activeOrganisationUuid`
  when no explicit value is set on the form data.

## Problem

Today's frontend assumes a single tenant per browser session. When a
user has access to multiple organisations and switches between them:

1. **Stale lists** — `fetchCollection()` cache from tenant A is
   served when the user is now in tenant B.
2. **Wrong-tenant writes** — `saveObject()` sends body without
   `organisation`, server stamps from session; if session is stale
   (multi-tab race), object lands in the wrong tenant.
3. **No UX signal** — the user has no badge / breadcrumb / dropdown
   showing which tenant they're operating in.
4. **File uploads + audit trails inherit unconditionally** — `filesPlugin`
   uses the parent object's organisation; if a relation crosses
   tenant boundaries (rare but possible per R2's audit), the file
   leaks.
5. **Per-app duplication** — every consuming app rolls its own
   tenant-state machinery; opencatalogi, decidesk, procest each have
   slightly different approaches.

## Proposed Solution

Two layers:

**Layer 1: composable + header.** `useTenantContext()` is the single
source of truth for "which tenant is active" on the frontend.
`buildHeaders()` always stamps the request when context is available.
Consumers use the composable; nothing else changes.

**Layer 2: store integration.** `createObjectStore` accepts an
optional `organisationUuidGetter` that ties the store's cache
invalidation + header stamping to the composable. Apps that opt in
get correct multi-tenant behaviour automatically. Apps that don't
opt in keep current behaviour.

This is incremental — no breaking change to current consumers.
Decidesk (Tier-4 manifest adopter) is the first migration target.

## Out of scope

- Server-side validation of `X-OpenRegister-Organisation` header (a
  separate OR change validates the header matches the session and
  warns/rejects on mismatch).
- An "App Builder" admin UI for cross-tenant configuration (defer).
- Migrating every existing app to consume the composable (each
  app's `{app}-adopt-manifest` change handles its own migration).

## See also

- Hydra ADR-022 (apps consume OR abstractions)
- Hydra ADR-024 (app-manifest fleet-wide adoption — this change
  pairs with it)
- `.claude/audit-2026-05-03/research/R2-nc-vue-multitenancy.md` — the
  audit research informing this change.
- `openregister/lib/Db/MultiTenancyTrait.php` — the server-side
  enforcement this change mirrors on the frontend.
