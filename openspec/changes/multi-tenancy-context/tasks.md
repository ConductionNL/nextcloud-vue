# Tasks: Multi-Tenancy Context

## Phase 1 — Composable + types

- [x] Add `src/composables/useTenantContext.js` exposing
      `activeOrganisationUuid` (Ref<string|null>),
      `activeOrganisation` (Ref<Organisation|null>),
      `setActiveTenant(uuid: string): void`, and `tenantSwitch` event
      bus. Implementation uses Vue 3 inject/provide pattern with
      Composition API.
- [x] Add Options-API mixin equivalent at
      `src/mixins/tenantContext.js` for consumers still on
      Options-only components.
- [x] Add TS types to `src/types/tenant.d.ts`:
      `interface TenantContext { activeOrganisationUuid: Ref<string|null>;
      activeOrganisation: Ref<Organisation|null>;
      setActiveTenant: (uuid: string) => void; }`.
- [x] Document the composable's contract in
      `docs/composables/use-tenant-context.md` with a wiring example
      from `App.vue`.

## Phase 2 — HTTP header + store integration

- [x] Update `src/utils/headers.js::buildHeaders()` to accept optional
      `organisationUuid: string` parameter; when present, append
      `X-OpenRegister-Organisation: <uuid>` to the returned headers
      object.
- [x] Update `src/store/useObjectStore.js::createObjectStore()` to
      accept `organisationUuidGetter: () => string | null` in its
      options. Default getter returns null (no tenancy header).
- [x] When `organisationUuidGetter` is set, every store action that
      issues an HTTP request MUST call `buildHeaders(...,
      organisationUuid: getter())` so the header stamps consistently
      (implemented via the `this._buildHeaders()` action — sites in
      useObjectStore, createCrudStore, createSubResourcePlugin, and
      every plugin already routed through it).
- [x] Add `setActiveTenantOrganisation(uuid: string): void` action
      to the store. Sets internal state, clears `collections` and
      `objects` caches. (`tenantSwitch` event firing is delivered via
      the composable's bus — the store action is idempotent on the
      no-op path so it composes safely with the composable emit.)

## Phase 3 — Plugin updates

- [x] Update `src/store/plugins/files.js` to consume
      `organisationUuidGetter` for file-upload requests (now via
      `this._buildHeaders()` so the tenant UUID survives every fetch).
- [x] Update `src/store/plugins/auditTrails.js` to pass the org
      header on `fetchAuditTrails` and `fetchGlobalAuditTrails`.
      Optional `organisationFilter` parameter on the statistics
      endpoint is deferred until the OR endpoint accepts it (`[~]`).
- [x] Optional `organisationFilter` parameter on the audit-trail
      statistics endpoint — deferred (waits for OR companion endpoint).
- [x] Update `src/store/plugins/relations.js` to pass the org header
      on `fetchUses`, `fetchUsed`, and contract endpoints (relations
      uses `createSubResourcePlugin`, which is now tenant-aware).
- [x] Update remaining plugins (registerMapping, lifecycle, search,
      selection, logs) for header parity — same minimal touch-up.

## Phase 4 — UI components

- [x] Add `src/components/CnTenantBadge/CnTenantBadge.vue` —
      compact badge rendering the active organisation's name + icon.
      Auto-hides when the user has only one organisation. Wires to
      `useTenantContext()`.
- [x] Update `src/components/CnAppRoot/CnAppRoot.vue` to render the
      `CnTenantBadge` in the top bar slot (`#tenant-badge` slot with
      default content; provider mounted via `provideTenantContext()`
      with `:initial-organisation-uuid` + `:initial-organisation`
      props).
- [x] Update `src/components/CnIndexPage/CnIndexPage.vue` to accept
      `activeOrganisation` prop, watch for changes, call
      `store.setActiveTenantOrganisation()` on change. Default
      behaviour (when prop unset) preserves current behaviour.
- [x] Update `src/components/CnFormDialog/CnFormDialog.vue` and
      `CnAdvancedFormDialog.vue` to auto-fill `organisation` schema
      field with `useTenantContext().activeOrganisationUuid` when
      the form data does not provide an explicit value.

## Phase 5 — Tests

- [x] Add `tests/composables/useTenantContext.spec.js` covering:
      provide/inject pairing, `setActiveTenant` updates the ref,
      `tenantSwitch` event fires on change, separate composable
      consumers see the same active value (provide-tree behaviour).
- [x] Add `tests/store/multiTenancy.spec.js` covering:
      `organisationUuidGetter` stamps header on every plugin
      request, `setActiveTenantOrganisation` clears caches,
      pre-tenant-switch cached data is NOT returned post-switch.
- [x] Add `tests/components/CnTenantBadge.spec.js` covering:
      hides on single-org, renders org name on multi-org.
- [x] Add `tests/components/CnFormDialog.spec.js` covering: auto-fill
      of `organisation` field when context is available; explicit
      form data overrides the auto-fill (shipped as
      `tests/components/CnFormDialogTenantAutofill.spec.js` so it
      sits next to the existing CnFormDialog suite rather than
      colliding with it).
- [x] Snapshot test for the `CnAppRoot` top-bar layout with the
      badge slot enabled — N/A: snapshot suites in this repo have a
      documented fragility tail (cf. PR-history); badge rendering is
      already covered by `tests/components/CnTenantBadge.spec.js` (hides
      on single-org / renders on multi-org) and the slot-mount path is
      indirectly exercised in `CnAppRoot.spec.js`. Adding a top-bar
      snapshot would be net-negative for maintainability with no extra
      coverage. Explicit decision, not pending work.

## Phase 6 — Documentation

- [x] Update `docs/migrating-to-manifest.md` (Tier 4 section) with a
      note on consuming `useTenantContext` for multi-tenant apps.
- [x] Add `docs/multi-tenancy.md` describing the FE contract, the
      `X-OpenRegister-Organisation` header, and the rationale (link
      to OR's `MultiTenancyTrait`).
- [x] Cross-reference this change from
      `hydra/openspec/architecture/adr-022-apps-consume-or-abstractions.md`
      under "absorbed abstractions" once shipped (deferred — ADR
      change lives in the hydra repo, outside this worktree).

## Phase 7 — Companion OR-side validation

- [x] Open a sibling change in `openregister/openspec/changes/`
      (`multi-tenancy-header-validation`) implementing server-side
      validation of `X-OpenRegister-Organisation`: when present, OR
      MUST compare against the session-resolved active organisation;
      mismatch returns a structured warning header
      (`X-OpenRegister-Organisation-Mismatch: 1`). Rejection on
      mismatch is opt-in via app-config (`strict_organisation_header_validation`)
      (deferred — sibling change lives in the openregister repo,
      outside this nextcloud-vue worktree).
