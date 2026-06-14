multi-tenancy-context
---
status: draft
---
# Multi-Tenancy Context

## Purpose

Provide frontend tenancy primitives in `@conduction/nextcloud-vue`
that mirror OpenRegister's server-side `MultiTenancyTrait`
enforcement. Adds a `useTenantContext()` composable, an
`X-OpenRegister-Organisation` request header, store-level cache
invalidation on tenant switch, and a `CnTenantBadge` UI component.
Closes the five critical + five cosmetic gaps identified in audit
R2 (2026-05-03).

## ADDED Requirements

### Requirement: The library MUST expose a `useTenantContext()` composable

The library MUST export `useTenantContext()` and `provideTenantContext()` from `@conduction/nextcloud-vue/composables/useTenantContext`. `provideTenantContext({ initialOrganisationUuid?, organisationsLoader? })` is called once at the consuming app's root (typically inside `App.vue::setup()`); `useTenantContext()` is called from any descendant. The composable returns `{ activeOrganisationUuid: Ref<string|null>, activeOrganisation: Ref<Organisation|null>, setActiveTenant: (uuid) => void, onTenantSwitch: (listener) => unsubscribe }`.

#### Scenario: provideTenantContext + useTenantContext pair correctly
- GIVEN `App.vue::setup()` calls `provideTenantContext({ initialOrganisationUuid: 'org-1' })`
- WHEN a descendant component calls `useTenantContext()`
- THEN the descendant MUST receive the same context object
- AND `activeOrganisationUuid.value` MUST equal `'org-1'`

#### Scenario: useTenantContext outside provider tree throws
- GIVEN no `provideTenantContext()` is in the component tree
- WHEN a component calls `useTenantContext()`
- THEN the call MUST throw `Error('useTenantContext must be called inside a provideTenantContext tree')`
- AND the error MUST surface to the developer console (not silently no-op)

### Requirement: `setActiveTenant(uuid)` MUST update the active org and emit `tenantSwitch`

When `setActiveTenant(uuid)` is called and `uuid !== activeOrganisationUuid.value`, the composable MUST: (a) update `activeOrganisationUuid` to the new value, (b) async-load the matching `Organisation` entity if `organisationsLoader` was provided, (c) call every registered `onTenantSwitch` listener with `{ previous, current }`. When `uuid === activeOrganisationUuid.value`, the call MUST be a no-op (no listener invocation).

#### Scenario: switching tenant fires the listener
- GIVEN `provideTenantContext({ initialOrganisationUuid: 'org-1' })`
- AND a listener registered via `onTenantSwitch(fn)`
- WHEN `setActiveTenant('org-2')` is called
- THEN `activeOrganisationUuid.value` MUST equal `'org-2'`
- AND the listener MUST have been called once with `{ previous: 'org-1', current: 'org-2' }`

#### Scenario: setActiveTenant with current value is a no-op
- GIVEN `activeOrganisationUuid.value === 'org-1'`
- AND a listener registered via `onTenantSwitch(fn)`
- WHEN `setActiveTenant('org-1')` is called
- THEN the listener MUST NOT have been called

### Requirement: `buildHeaders()` MUST stamp `X-OpenRegister-Organisation` when context is provided

`buildHeaders({ organisationUuid })` MUST add `X-OpenRegister-Organisation: <uuid>` to the returned headers when `organisationUuid` is a non-empty string. When `organisationUuid` is null, undefined, or empty, the header MUST be omitted.

#### Scenario: header is stamped when uuid is provided
- WHEN `buildHeaders({ organisationUuid: 'org-1' })` is called
- THEN the returned headers object MUST include `'X-OpenRegister-Organisation': 'org-1'`

#### Scenario: header is omitted when uuid is null
- WHEN `buildHeaders({ organisationUuid: null })` is called
- THEN the returned headers object MUST NOT include `X-OpenRegister-Organisation`

### Requirement: `createObjectStore` MUST accept `organisationUuidGetter`

`createObjectStore(id, { plugins, baseUrl, organisationUuidGetter })` MUST accept an optional `organisationUuidGetter: () => string | null` field in its options. When provided, every store action issuing an HTTP request MUST call `buildHeaders({ organisationUuid: organisationUuidGetter() })` so the header stamps consistently. When not provided, requests MUST omit the header (current behaviour).

#### Scenario: store stamps header when getter is wired
- GIVEN a store created with `organisationUuidGetter: () => 'org-1'`
- WHEN `store.fetchCollection()` issues an HTTP request
- THEN the request MUST include header `X-OpenRegister-Organisation: org-1`

#### Scenario: store omits header when getter is unset
- GIVEN a store created without `organisationUuidGetter`
- WHEN `store.fetchCollection()` issues an HTTP request
- THEN the request MUST NOT include `X-OpenRegister-Organisation`

#### Scenario: getter returns null at request time
- GIVEN a store created with `organisationUuidGetter: () => null`
- WHEN `store.fetchCollection()` issues an HTTP request
- THEN the request MUST NOT include `X-OpenRegister-Organisation`

### Requirement: `setActiveTenantOrganisation(uuid)` action MUST clear caches

The store MUST expose `setActiveTenantOrganisation(uuid: string): void` as a base action. When called, the action MUST: (a) update an internal `activeOrganisation` state field, (b) clear the `collections` cache, (c) clear the `objects` cache, (d) emit a `tenantSwitch` event via Pinia's `$onAction`-compatible mechanism.

#### Scenario: tenant switch clears the collections cache
- GIVEN a store with `collections` cache populated for tenant `'org-1'`
- WHEN `store.setActiveTenantOrganisation('org-2')` is called
- THEN `store.collections` MUST be empty
- AND `store.objects` MUST be empty

#### Scenario: tenant switch with same value is a no-op
- GIVEN `store.activeOrganisation === 'org-1'` and a populated `collections` cache
- WHEN `store.setActiveTenantOrganisation('org-1')` is called
- THEN `store.collections` MUST be unchanged

### Requirement: Plugins MUST stamp the org header when getter is wired

The bundled plugins (`filesPlugin`, `auditTrailsPlugin`, `relationsPlugin`, `registerMappingPlugin`, `lifecyclePlugin`, `searchPlugin`, `selectionPlugin`) MUST call `buildHeaders({ organisationUuid: organisationUuidGetter() })` on every HTTP request they issue when the store has an `organisationUuidGetter` configured.

#### Scenario: filesPlugin upload stamps the header
- GIVEN a store with `filesPlugin()` and `organisationUuidGetter: () => 'org-1'`
- WHEN `store.uploadFiles(...)` issues a POST request
- THEN the request MUST include header `X-OpenRegister-Organisation: org-1`

#### Scenario: auditTrailsPlugin fetch stamps the header
- GIVEN a store with `auditTrailsPlugin()` and `organisationUuidGetter: () => 'org-1'`
- WHEN `store.fetchAuditTrails(...)` issues a GET request
- THEN the request MUST include header `X-OpenRegister-Organisation: org-1`

### Requirement: `auditTrailsPlugin` MUST accept an `organisationFilter` parameter

`fetchGlobalAuditTrails({ organisationFilter? })` and `fetchAuditTrailStatistics({ organisationFilter? })` MUST accept an optional `organisationFilter: string` parameter. When provided, the request MUST include `?organisation=<uuid>` query parameter to filter results by that organisation explicitly. When omitted, current behaviour is preserved.

#### Scenario: audit-trail fetch with explicit org filter
- WHEN `store.fetchGlobalAuditTrails({ organisationFilter: 'org-1' })` is called
- THEN the request URL MUST include `?organisation=org-1`

### Requirement: `CnTenantBadge` MUST render the active organisation, auto-hide on single-org

The library MUST export `CnTenantBadge` from `src/components/CnTenantBadge`. The component MUST: (a) consume `useTenantContext()`, (b) render the active `Organisation`'s name + icon when present, (c) auto-hide (render nothing) when the user has only one organisation available.

#### Scenario: badge renders active org name on multi-org
- GIVEN the user has access to 3 organisations
- AND `activeOrganisation.value === { name: 'Acme Tenant', icon: 'icon-org-acme' }`
- WHEN `<CnTenantBadge />` mounts
- THEN the rendered DOM MUST contain `'Acme Tenant'`
- AND the org icon MUST be present

#### Scenario: badge hides on single-org
- GIVEN the user has access to exactly 1 organisation
- WHEN `<CnTenantBadge />` mounts
- THEN the component MUST render nothing visible (no DOM, or `display: none`)

### Requirement: `CnFormDialog` MUST auto-fill `organisation` when context is available

When a schema declares an `organisation` field AND the form data does not provide an explicit value AND `useTenantContext()` is available, `CnFormDialog` (and `CnAdvancedFormDialog`) MUST initialise the field's default value to `useTenantContext().activeOrganisationUuid`. Explicit values in the form data MUST override the auto-fill.

#### Scenario: form auto-fills active org when not explicitly set
- GIVEN `activeOrganisationUuid.value === 'org-1'`
- AND a schema with an `organisation` field
- AND form data without an explicit `organisation` value
- WHEN `<CnFormDialog />` mounts
- THEN the form's `organisation` field MUST default to `'org-1'`

#### Scenario: explicit form value overrides auto-fill
- GIVEN `activeOrganisationUuid.value === 'org-1'`
- AND form data `{ organisation: 'org-2', ... }`
- WHEN `<CnFormDialog />` mounts
- THEN the form's `organisation` field MUST equal `'org-2'`
