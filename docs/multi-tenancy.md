# Multi-tenancy front-end contract

Conduction apps share a single front-end pattern for tenant scoping. One `activeOrganisationUuid` flows top-to-bottom via the [`useTenantContext`](./composables/use-tenant-context.md) provider, every outbound store request stamps `X-OpenRegister-Organisation: <uuid>`, and OpenRegister's `MultiTenancyTrait` filters reads/writes server-side using that header.

Spec: `openspec/changes/multi-tenancy-context`.

## The contract in one diagram

```
┌─────────────────────────────────────────────────────────────┐
│  CnAppRoot                                                  │
│    provideTenantContext(initialUuid, initialOrg)            │
│       │                                                     │
│       └─→  activeOrganisationUuid (Ref<string|null>)        │
│           setActiveTenant(uuid)                             │
│           onTenantSwitch(cb)                                │
└────────────┬────────────────────────────────────────────────┘
             │ inject via TENANT_CONTEXT_KEY
             ▼
   ┌─────────────────────────────────────────┐
   │  Any descendant (composable / mixin)    │
   │    const { setActiveTenant, ... } =     │
   │        useTenantContext()               │
   └─────────────────┬───────────────────────┘
                     │ setActiveTenant('next')
                     ▼
   ┌─────────────────────────────────────────┐
   │  useObjectStore / createCrudStore       │
   │    setActiveTenantOrganisation('next')  │
   │       clears caches; future fetch       │
   │       stamps X-OpenRegister-Organisation│
   └─────────────────────────────────────────┘
```

## The `X-OpenRegister-Organisation` header

| Direction | Behaviour |
|-----------|-----------|
| **FE → BE** | When `useTenantContext().activeOrganisationUuid.value` is non-null, every store fetch stamps `X-OpenRegister-Organisation: <uuid>`. `buildHeaders({ organisationUuid })` is the single source of truth. |
| **BE validation (opt-in)** | When `strict_organisation_header_validation` is enabled, OpenRegister's `MultiTenancyTrait` compares the header against the session-resolved active organisation and rejects mismatches. |
| **BE warning (default)** | When validation is disabled, mismatches return `X-OpenRegister-Organisation-Mismatch: 1` for the FE to surface. |

## Hooks the front-end exposes

| Surface | Hook | Notes |
|---------|------|-------|
| Composables | `useTenantContext()` | Reads/writes the shared context. |
| Composables | `provideTenantContext(uuid, org)` | Used internally by CnAppRoot; available for hand-built shells. |
| Mixins | `tenantContextMixin` | Options-API parity for the same surface. |
| Stores | `createObjectStore('id', { organisationUuidGetter })` | Factory-time wiring; getter is called on every fetch. |
| Stores | `store.setActiveTenantOrganisation(uuid)` | Runtime override; clears caches. |
| Components | `<CnTenantBadge />` | Top-bar tenant chip; auto-hides on 0–1 organisations. |
| Components | `<CnIndexPage :active-organisation />` | Propagates the bound entity into the store. |
| Components | `<CnFormDialog />` / `<CnAdvancedFormDialog />` | Auto-fill `organisation` on create when the context is active. |

## Migration outline

1. Mount `provideTenantContext()` (or use `CnAppRoot` with `:initial-organisation-uuid`).
2. Add a tenant switcher somewhere in your top-bar (`<CnTenantBadge />` plus a tenant picker, typically a Nextcloud `NcActionRadio` list).
3. Configure any consumer stores with `organisationUuidGetter: () => useTenantContext().activeOrganisationUuid.value` if you want bind-time stamping (otherwise rely on `setActiveTenantOrganisation()` calls).
4. If your schema declares an `organisation` field, drop any explicit `:value` bindings — the form dialogs will stamp it.
5. Server-side: enable `MultiTenancyTrait` per the OpenRegister docs and (optionally) flip on `strict_organisation_header_validation`.

## Rationale

The trait approach is intentionally minimal. Single-tenant apps don't have to opt in; the inject fallback is a noop that warns instead of crashing, the header is omitted when no tenant is active, and the form auto-fill is idempotent on edit. Apps that need richer per-tenant theming (avatars, primary colour, sidebar density) can sit on top of the same context — the provider exposes the resolved `activeOrganisation` entity, not just a UUID.

See [docs/composables/use-tenant-context.md](./composables/use-tenant-context.md) for the API reference.
