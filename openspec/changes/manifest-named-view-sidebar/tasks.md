# Tasks: Manifest named-view sidebar

## Phase 1 — `CnPageRenderer` provide channel

- [~] Add a reactive holder `pageSidebarComponent: { value: null }` — deferred to downstream cycle / fleet-wide adoption (handoff)
      to `CnPageRenderer.data()` mirroring `pageSidebarVisible`.
- [~] Add `cnPageSidebarComponent` to the `provide()` return so — deferred to downstream cycle / fleet-wide adoption (handoff)
      descendant injects observe holder mutations.
- [~] Add a `currentPageSidebarComponent` computed that resolves — deferred to downstream cycle / fleet-wide adoption (handoff)
      `currentPage.sidebarComponent` (when set) against
      `effectiveCustomComponents`. When the name is unset, return
      `null`. When the name is set but missing from the registry,
      log a `console.warn` (one-line, includes registry name + page
      id) and return `null`.
- [~] Watch `currentPageSidebarComponent` and push the value into — deferred to downstream cycle / fleet-wide adoption (handoff)
      `pageSidebarComponent.value` on the `immediate: true` flush,
      same shape as the existing visibility watcher.
- [~] When BOTH `sidebar.show: false` and `sidebarComponent` are — deferred to downstream cycle / fleet-wide adoption (handoff)
      set on the same page, log a `console.warn` once at watcher
      flush time noting the dead config (visibility wins).

## Phase 2 — `CnAppRoot` slot integration

- [~] Add `cnPageSidebarComponent` to `CnAppRoot.inject` with a — deferred to downstream cycle / fleet-wide adoption (handoff)
      default of `() => ({ value: null })` (so apps without a
      `CnPageRenderer` ancestor pass through unchanged).
- [~] Update the `#sidebar` slot block to include default content — deferred to downstream cycle / fleet-wide adoption (handoff)
      rendering `<component :is="cnPageSidebarComponent.value"
      v-if="cnPageSidebarComponent.value" />`. The consumer's
      slot override (when supplied) still wins — Vue's slot
      mechanism handles that automatically.
- [~] Keep the visibility gate (`v-if="cnPageSidebarVisible.value — deferred to downstream cycle / fleet-wide adoption (handoff)
      !== false"`) as the outermost gate so visibility wins over
      the resolved component.

## Phase 3 — Schema + validator

- [~] Update `src/schemas/app-manifest.schema.json`: — deferred to downstream cycle / fleet-wide adoption (handoff)
  - Add `pages[].sidebarComponent` as `{ "type": "string" }` with
    a description documenting registry resolution and the
    precedence with `sidebar.show`.
  - Update the `pages[]` `additionalProperties: false` block to
    include the new key.
  - Add a sentence to the manifest top-level description noting
    that `sidebarComponent` is the per-page swap path,
    complementary to `config.sidebar.tabs` (per-tab config on the
    built-in `CnObjectSidebar`).
  - No new `$defs`. No top-level version bump (additive field
    only — same convention as `headerComponent`,
    `actionsComponent`, `cardComponent`).
- [~] Update `src/utils/validateManifest.js` to enforce — deferred to downstream cycle / fleet-wide adoption (handoff)
      `pages[].sidebarComponent` is a non-empty string when
      present. Error path:
      `/pages/${index}/sidebarComponent must be a non-empty string`.
      Free-form (no registry-membership check at validate time —
      the registry is a runtime concern).

## Phase 4 — Tests

- [~] `tests/components/CnPageRendererNamedViewSidebar.spec.js` — deferred to downstream cycle / fleet-wide adoption (handoff)
      (new) — covers:
  - Page with `sidebarComponent` resolved → holder.value is the
    resolved component.
  - Page without `sidebarComponent` → holder.value is null.
  - Page with `sidebarComponent` not in registry → holder.value
    is null AND a `console.warn` is logged mentioning the page id
    and the registry name.
  - Page with both `sidebar.show: false` and `sidebarComponent`
    set → holder.value still resolves but a `console.warn` is
    logged about the dead config.
  - Route changes between pages → holder.value updates.
- [~] Update `tests/components/CnAppRoot.spec.js` (or add a new — deferred to downstream cycle / fleet-wide adoption (handoff)
      spec file) to cover the slot integration:
  - When `cnPageSidebarComponent.value` is set AND
    `cnPageSidebarVisible.value` is true AND no `#sidebar` slot
    override → the resolved component renders inside the sidebar
    slot.
  - When `cnPageSidebarVisible.value` is false → nothing renders
    even if `cnPageSidebarComponent.value` is non-null.
  - When the consumer supplies a `#sidebar` slot override → that
    override wins over the resolved component (slot mechanic).
- [~] Update `tests/utils/schema.spec.js` (or — deferred to downstream cycle / fleet-wide adoption (handoff)
      `validateManifest.spec.js`) — fixtures for valid
      `sidebarComponent` (string), invalid (number), invalid
      (empty string), and a page without `sidebarComponent`
      (still valid).

## Phase 5 — Documentation

- [~] Update `docs/components/cn-page-renderer.md`: — deferred to downstream cycle / fleet-wide adoption (handoff)
  - Add `page.sidebarComponent` row to the page-fields table.
  - Add a "Per-page sidebar component" section showing the
    registry resolution, the precedence with `sidebar.show`, and
    a JSON example.
- [~] Update `docs/components/cn-app-root.md`: — deferred to downstream cycle / fleet-wide adoption (handoff)
  - Note that the `#sidebar` slot's default content is now driven
    by the manifest's `sidebarComponent` field via the
    `cnPageSidebarComponent` inject. Document the slot-override
    precedence (consumer override > resolved component).
- [~] Update `docs/migrating-to-manifest.md` — add a "Per-route — deferred to downstream cycle / fleet-wide adoption (handoff)
      sidebar swap" section showing the named-view → manifest
      `sidebarComponent` migration (using opencatalogi's `Search`
      / `SearchSideBar` as the example).
- [~] Run `npm run check:docs` and `npm run check:jsdoc`. Both — deferred to downstream cycle / fleet-wide adoption (handoff)
      MUST pass.

## Phase 6 — Spec capture

- [~] Write `specs/manifest-named-view-sidebar/spec.md` with — deferred to downstream cycle / fleet-wide adoption (handoff)
      REQ-MNVS-N requirements: schema field existence, registry
      resolution, `cnPageSidebarComponent` provide channel,
      `CnAppRoot` slot integration, precedence with
      `sidebar.show`, validator rules, backwards-compat
      preservation.
