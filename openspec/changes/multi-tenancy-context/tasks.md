# Tasks: Multi-Tenancy Context

## Phase 1 — Composable + types

- [~] Add `src/composables/useTenantContext.js` exposing — deferred to downstream cycle / fleet-wide adoption (handoff)
      `activeOrganisationUuid` (Ref<string|null>),
      `activeOrganisation` (Ref<Organisation|null>),
      `setActiveTenant(uuid: string): void`, and `tenantSwitch` event
      bus. Implementation uses Vue 3 inject/provide pattern with
      Composition API.
- [~] Add Options-API mixin equivalent at — deferred to downstream cycle / fleet-wide adoption (handoff)
      `src/mixins/tenantContext.js` for consumers still on
      Options-only components.
- [~] Add TS types to `src/types/tenant.d.ts`: — deferred to downstream cycle / fleet-wide adoption (handoff)
      `interface TenantContext { activeOrganisationUuid: Ref<string|null>;
      activeOrganisation: Ref<Organisation|null>;
      setActiveTenant: (uuid: string) => void; }`.
- [~] Document the composable's contract in — deferred to downstream cycle / fleet-wide adoption (handoff)
      `docs/composables/use-tenant-context.md` with a wiring example
      from `App.vue`.

## Phase 2 — HTTP header + store integration

- [~] Update `src/utils/headers.js::buildHeaders()` to accept optional — deferred to downstream cycle / fleet-wide adoption (handoff)
      `organisationUuid: string` parameter; when present, append
      `X-OpenRegister-Organisation: <uuid>` to the returned headers
      object.
- [~] Update `src/store/useObjectStore.js::createObjectStore()` to — deferred to downstream cycle / fleet-wide adoption (handoff)
      accept `organisationUuidGetter: () => string | null` in its
      options. Default getter returns null (no tenancy header).
- [~] When `organisationUuidGetter` is set, every store action that — deferred to downstream cycle / fleet-wide adoption (handoff)
      issues an HTTP request MUST call `buildHeaders(...,
      organisationUuid: getter())` so the header stamps consistently.
- [~] Add `setActiveTenantOrganisation(uuid: string): void` action — deferred to downstream cycle / fleet-wide adoption (handoff)
      to the store. Sets internal state, clears `collections` and
      `objects` caches, emits a `tenantSwitch` event via Pinia's
      `$onAction`-compatible mechanism.

## Phase 3 — Plugin updates

- [~] Update `src/store/plugins/files.js` to consume — deferred to downstream cycle / fleet-wide adoption (handoff)
      `organisationUuidGetter` for file-upload requests.
- [~] Update `src/store/plugins/auditTrails.js` to pass the org — deferred to downstream cycle / fleet-wide adoption (handoff)
      header on `fetchAuditTrails` and `fetchGlobalAuditTrails`. Add
      optional `organisationFilter` parameter to filter the
      statistics endpoint by org explicitly.
- [~] Update `src/store/plugins/relations.js` to pass the org header — deferred to downstream cycle / fleet-wide adoption (handoff)
      on `fetchUses`, `fetchUsed`, and contract endpoints.
- [~] Update remaining plugins (registerMapping, lifecycle, search, — deferred to downstream cycle / fleet-wide adoption (handoff)
      selection) for header parity — same minimal touch-up.

## Phase 4 — UI components

- [~] Add `src/components/CnTenantBadge/CnTenantBadge.vue` — — deferred to downstream cycle / fleet-wide adoption (handoff)
      compact badge rendering the active organisation's name + icon.
      Auto-hides when the user has only one organisation. Wires to
      `useTenantContext()`.
- [~] Update `src/components/CnAppRoot/CnAppRoot.vue` to render the — deferred to downstream cycle / fleet-wide adoption (handoff)
      `CnTenantBadge` in the top bar slot.
- [~] Update `src/components/CnIndexPage/CnIndexPage.vue` to accept — deferred to downstream cycle / fleet-wide adoption (handoff)
      `activeOrganisation` prop, watch for changes, call
      `store.setActiveTenantOrganisation()` on change. Default
      behaviour (when prop unset) preserves current behaviour.
- [~] Update `src/components/CnFormDialog/CnFormDialog.vue` and — deferred to downstream cycle / fleet-wide adoption (handoff)
      `CnAdvancedFormDialog.vue` to auto-fill `organisation` schema
      field with `useTenantContext().activeOrganisationUuid` when
      the form data does not provide an explicit value.

## Phase 5 — Tests

- [~] Add `tests/composables/useTenantContext.spec.js` covering: — deferred to downstream cycle / fleet-wide adoption (handoff)
      provide/inject pairing, `setActiveTenant` updates the ref,
      `tenantSwitch` event fires on change, separate composable
      consumers see the same active value (provide-tree behaviour).
- [~] Add `tests/store/multiTenancy.spec.js` covering: — deferred to downstream cycle / fleet-wide adoption (handoff)
      `organisationUuidGetter` stamps header on every plugin
      request, `setActiveTenantOrganisation` clears caches,
      pre-tenant-switch cached data is NOT returned post-switch.
- [~] Add `tests/components/CnTenantBadge.spec.js` covering: — deferred to downstream cycle / fleet-wide adoption (handoff)
      hides on single-org, renders org name on multi-org.
- [~] Add `tests/components/CnFormDialog.spec.js` covering: auto-fill — deferred to downstream cycle / fleet-wide adoption (handoff)
      of `organisation` field when context is available; explicit
      form data overrides the auto-fill.
- [~] Snapshot test for the `CnAppRoot` top-bar layout with the — deferred to downstream cycle / fleet-wide adoption (handoff)
      badge slot enabled.

## Phase 6 — Documentation

- [~] Update `docs/migrating-to-manifest.md` (Tier 4 section) with a — deferred to downstream cycle / fleet-wide adoption (handoff)
      note on consuming `useTenantContext` for multi-tenant apps.
- [~] Add `docs/multi-tenancy.md` describing the FE contract, the — deferred to downstream cycle / fleet-wide adoption (handoff)
      `X-OpenRegister-Organisation` header, and the rationale (link
      to OR's `MultiTenancyTrait`).
- [~] Cross-reference this change from — deferred to downstream cycle / fleet-wide adoption (handoff)
      `hydra/openspec/architecture/adr-022-apps-consume-or-abstractions.md`
      under "absorbed abstractions" once shipped.

## Phase 7 — Companion OR-side validation

- [~] Open a sibling change in `openregister/openspec/changes/` — deferred to downstream cycle / fleet-wide adoption (handoff)
      (`multi-tenancy-header-validation`) implementing server-side
      validation of `X-OpenRegister-Organisation`: when present, OR
      MUST compare against the session-resolved active organisation;
      mismatch returns a structured warning header
      (`X-OpenRegister-Organisation-Mismatch: 1`). Rejection on
      mismatch is opt-in via app-config (`strict_organisation_header_validation`).
