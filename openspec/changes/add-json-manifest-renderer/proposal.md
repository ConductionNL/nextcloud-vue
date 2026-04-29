# Proposal: add-json-manifest-renderer

## Summary

Add a JSON-driven manifest system to `@conduction/nextcloud-vue` that lets each Conduction app declare its routes, navigation, page content, and widget configuration in a single `src/manifest.json` file. New components — `CnAppRoot`, `CnAppNav`, `CnPageRenderer` — and a composable `useAppManifest` replace per-page `.vue` boilerplate, enforce a closed DSL, and future-proof against a backend app-builder that can override the manifest at runtime.

## Motivation

Every Conduction app currently hand-rolls the same pattern: a `main.ts` mounting an `NcContent` wrapper, per-route `.vue` stubs that dispatch to `CnIndexPage`/`CnDetailPage`/`CnDashboardPage`, and nav wiring repeated in each app. This produces three problems:

1. **Duplication** — the same 80-line navigation + router-view boilerplate exists across OpenRegister, OpenCatalogi, Procest, Pipelinq, MyDash, and every future app.
2. **Inconsistency** — each app drifts in how it wires permissions, active-route highlighting, and i18n key resolution.
3. **No runtime override** — adding an "app builder" backend later (letting admins customise pages without a code deploy) requires a standard manifest contract. That contract must be defined now to avoid migration pain later.

The manifest system solves all three: one canonical shape, one renderer, one composable, one JSON Schema as the FE/BE contract.

## Affected Projects

- [ ] Project: `nextcloud-vue` — New capability `json-manifest-renderer` introduced; all new, nothing removed. Existing `CnIndexPage` and `CnDetailPage` gain optional `#header` and `#actions` slots (additive, no breaking change).
- [ ] Project: `openregister` — Can adopt manifest pattern (separate migration change; NOT in scope here)
- [ ] Project: `opencatalogi` — Can adopt manifest pattern (separate migration change; NOT in scope here)
- [ ] Project: `procest` — Can adopt manifest pattern (separate migration change; NOT in scope here)
- [ ] Project: `pipelinq` — Can adopt manifest pattern (separate migration change; NOT in scope here)
- [ ] Project: `mydash` — Can adopt manifest pattern (separate migration change; NOT in scope here)

## Scope

### In Scope

- New components: `CnAppRoot`, `CnAppNav`, `CnPageRenderer`, `CnAppLoading`, `CnDependencyMissing`
- New composable: `useAppManifest` (bundled load → BE merge stub → JSON Schema validation → reactive return), `useAppStatus`
- New artifact: `src/schemas/app-manifest.schema.json` (single source of truth for FE, future BE, and CI)
- New TypeScript types: `src/types/manifest.d.ts` (generated from the schema)
- Additive slot additions to existing components: `#header` and `#actions` slots on `CnIndexPage` / `CnDetailPage` (no breaking change to existing consumers)
- Barrel exports for all new components and composables
- Unit tests: per component, per composable, schema validation, custom-component fallback
- Example/fixture manifest exercising all four page types
- Migration guide for consuming apps covering all four adoption tiers
- Dependency-check phase orchestration in `CnAppRoot` (loading → dependency-check → shell)

### Out of Scope

- Backend manifest endpoint shape and auth model — defined when the app builder spec opens
- Per-app migrations (each consuming app gets its own change)
- Hydra CI checks for i18n key coverage and manifest validity (tracked as ConductionNL/hydra#194 and #195)
- Any modification to `dashboard-widget-system` (sibling change, complete and complementary)

## Approach

One new capability — `json-manifest-renderer` — groups the manifest shape, renderer, composable, and JSON Schema as a cohesive unit. Nothing in the existing `layout-components`, `composables`, `index-page`, or `dashboard-page` specs changes; `CnPageRenderer` simply dispatches to the existing `CnIndexPage`/`CnDetailPage`/`CnDashboardPage`.

The manifest shape is a single JSON file: `{ version, menu[], pages[] }`. A closed `type` enum on `pages[]` (`"index" | "detail" | "dashboard" | "custom"`) prevents DSL creep. The `"custom"` escape hatch lets apps supply arbitrary components via a registry without forking the renderer.

`CnAppRoot` provides the manifest, custom-component registry, and translate function (`t`) to descendants via Vue's `provide/inject`, avoiding prop drilling. The `t` function is always passed in from the consuming app — the library never imports `t()` from any specific app.

Loading is hybrid: the bundled `manifest.json` (zero latency) is used immediately; if a backend endpoint later returns an override, it is deep-merged on top. If the merged result fails schema validation, the bundled manifest is the fallback.

**Incremental adoption** is a first-class design goal. Apps can adopt the manifest system in four tiers — from just using `useAppManifest` for loading and validation, all the way to the full `CnAppRoot` shell — without having to adopt the entire stack at once. Apps that want manifest-driven pages but their own root layout or custom menu (e.g. mydash's `MainMenu`) are explicitly supported via `#menu` and other slots on `CnAppRoot`, and via direct props on `CnPageRenderer` and `CnAppNav` that override `inject`.

## Cross-Project Dependencies

- **`dashboard-widget-system` change** (already complete in `nextcloud-vue`) — `CnPageRenderer`'s `type: "dashboard"` dispatches to `CnDashboardPage` from that change. No modifications required.
- **ConductionNL/hydra#194, #195** — Hydra CI checks will use the JSON Schema shipped here. Those issues are tracked separately; this change ships the schema; the CI integration is out of scope.

## Rollback Strategy

All new components are additive. No existing prop interfaces change. Apps that have not adopted the manifest pattern keep working unchanged. Rolling back is a matter of unpublishing the npm package version; consuming apps remain on the prior version.

## Open Questions

None blocking this change. Deferred decisions are captured in `DEFERRED_QUESTIONS` at the bottom of the design document.
