# Design: add-json-manifest-renderer

## Architecture Overview

The manifest renderer sits between a consuming app's `main.ts` entry point and the existing page-level components (`CnIndexPage`, `CnDetailPage`, `CnDashboardPage`). It does not replace those components — it dispatches to them.

```
main.ts
  └─ CnAppRoot (provide: manifest, customComponents, t)
       │  phases: loading → dependency-check → shell
       ├─ [#loading slot]         (default: CnAppLoading)
       ├─ [#dependency-missing]   (default: CnDependencyMissing)
       ├─ [#menu slot]            (default: CnAppNav)
       │    └─ CnAppNav          (inject: manifest, cnTranslate → renders menu[])
       └─ <router-view>     (renders CnPageRenderer per route)
            └─ CnPageRenderer (inject: manifest, customComponents, cnTranslate)
                              (or: accepts manifest/customComponents/translate props directly)
                 ├─ type=index    → CnIndexPage
                 ├─ type=detail   → CnDetailPage
                 ├─ type=dashboard→ CnDashboardPage
                 └─ type=custom   → customComponents[page.component]
```

The manifest is loaded by `useAppManifest` and provided at `CnAppRoot`. Everything below injects what it needs; no prop drilling. Components that accept explicit props (CnPageRenderer, CnAppNav) use props over inject when both are present, enabling standalone use without CnAppRoot.

## Adoption Tiers

Apps can adopt the manifest system incrementally. Each tier is self-contained; no higher tier is required.

**Tier 1 — `useAppManifest` only.** Just the composable for loading + validation. App keeps its own router, main.ts, and layout components. Use this to get a validated reactive manifest without changing anything else.

**Tier 2 — + `CnPageRenderer`.** Reuse the type-dispatch logic. Pass `manifest`, `customComponents`, and `translate` as direct props (no `CnAppRoot` required). App still owns its router config and root layout.

**Tier 3 — + `CnAppNav` (or custom menu).** Add manifest-driven nav. Pass `manifest` and `translate` as direct props to `CnAppNav` (or use inject from a parent provide). App still owns its root shell.

**Tier 4 — + `CnAppRoot`.** Full shell: phases (loading → dependency-check → shell), provide/inject wiring, `NcContent` wrapping. Use the `#menu` slot to keep a custom menu component while still benefiting from the shell orchestration.

## Goals / Non-Goals

**Goals:**
- Zero boilerplate for standard index/detail/dashboard pages — configure in manifest.json
- Single JSON Schema (`src/schemas/app-manifest.schema.json`) that FE validates against at startup and future BE validates against when app builder lands
- Reactive manifest — future hot-swap without page reload
- Portable i18n — `t` is always injected from the consuming app; library never owns it
- Tree-shaking — page type components loaded via `defineAsyncComponent`

**Non-Goals:**
- Backend endpoint shape/auth (out of scope; the BE merge step is a no-op stub today)
- Breaking changes to `CnIndexPage`, `CnDetailPage`, `CnDashboardPage` interfaces (additive slot additions only)
- Per-app migrations (separate changes per consuming app)
- Hydra CI checks (tracked as hydra#194, #195)

## Decisions

### Decision 1: One new capability, not split across existing specs

**Choice:** New `json-manifest-renderer` capability (Option A).

**Rationale:** `CnAppRoot`, `CnAppNav`, `CnPageRenderer`, `useAppManifest`, and the JSON Schema form one cohesive unit — they are only useful together and share a single lifecycle (the manifest). Splitting them across `layout-components` and `composables` would scatter the mental model.

**Alternative considered:** Absorbing `CnAppRoot`/`CnAppNav` into `layout-components` and `useAppManifest` into `composables`. Rejected because both existing specs are `status: reviewed` and the new components require references to the manifest shape which belongs in neither place.

### Decision 2: `t` via provide/inject, not prop drilling

**Choice:** `CnAppRoot` accepts `t` as a prop (named `t`, matching Nextcloud convention) and provides it via `provide('cnTranslate', t)`. `CnAppNav` and `CnPageRenderer` inject `cnTranslate`. When used standalone (without CnAppRoot), `CnAppNav` and `CnPageRenderer` accept a `translate` prop that takes precedence over any injected value.

**Inject key naming:** `cnTranslate` follows the existing pattern of full lowercase words (`cnManifest`, `cnCustomComponents`). The prop name on CnAppRoot remains `t` (concise, matches Nextcloud's `t(app, key)` convention); the mapping `t → provide('cnTranslate')` is documented in REQ-JMR-003.

**Rationale:** Library rule: components must never import `t()` from a specific app. A single provide at root is cleaner than passing `t` through every intermediate component as a prop. The manifest stores i18n keys only (`menu[].label`, `pages[].title` are translation keys); `t(key)` resolves them at render time in the consuming app's namespace.

**Alternative considered:** Storing pre-translated strings in the manifest. Rejected because it would require re-loading or re-generating the manifest on locale change. Key-only storage is locale-agnostic.

### Decision 3: Hybrid manifest loading — bundled first, BE merge second

**Choice:** `useAppManifest` imports the bundled `manifest.json` synchronously, renders immediately, then fetches `/index.php/apps/{appId}/api/manifest` and deep-merges any override. If the merged result fails schema validation, falls back to bundled.

**Rationale:** Zero flash-of-empty on page load (bundled is instant). The BE contract is undefined today but the wire is ready — when app builder lands, it just needs to expose the endpoint. Silent 404/error means apps without a backend still work.

**Alternative considered:** BE-first with a loading state. Rejected because it would break the current no-backend flow and introduce a visible loading delay.

### Decision 4: Closed `type` enum as DSL guard

**Choice:** `pages[].type` is `"index" | "detail" | "dashboard" | "custom"`. Adding a fifth type requires a library release.

**Rationale:** DSL creep is the main long-term risk. The `"custom"` escape hatch covers any app-specific page without needing a new type. The JSON Schema enforces this at startup validation.

### Decision 5: `defineAsyncComponent` per page type

**Choice:** `CnPageRenderer` maps each type to a `defineAsyncComponent(() => import(...))` call.

**Rationale:** Consuming apps that use only `index` + `detail` should not pay the bundle cost for `CnDashboardPage` (which pulls in GridStack). Vue 2.7 natively supports `defineAsyncComponent`.

### Decision 6: `pages[].id` is the vue-router route name; route matching is by name only

**Choice:** `pages[].id` IS the vue-router **route name**. Required, must be unique within the manifest. `pages[].route` is the **path pattern** (e.g. `/decisions`, `/decisions/:id`), used by the consuming app when building its vue-router config from the manifest. `CnPageRenderer` matches by `$route.name === page.id`. Period. No path matching.

**Rationale:** Route name matching is unambiguous and immune to dynamic segments. Using both `name` and `path` matching introduces subtle bugs when dynamic segments are involved (e.g. `/decisions/:id` would never match `/decisions/abc` literally). The `route` field still has value: consuming apps and future tooling can auto-generate their vue-router config from the manifest.

**Affects:** REQ-JMR-001 (schema semantics), REQ-JMR-005 (matching logic).

## Route Params

Vue Router 3 (the Vue 2 compatible version) injects `$route` globally on every Vue instance via the router plugin. Pages rendered inside `<router-view>` already have access to `$route.params` directly — no special forwarding from `CnPageRenderer` is needed. A page like `CnDetailPage` that receives a dynamic segment (e.g. `/decisions/:id`) simply reads `this.$route.params.id`. `CnPageRenderer` does not need a `routeParams` prop.

## Manifest Version vs Schema Version

Two separate version concepts exist:

- **Manifest content `version`** (REQUIRED semver string, top-level in the manifest JSON): the version of the manifest content itself. Bumped when the manifest changes meaningfully. Used for cache busting and app-builder migration tracking.
- **Schema version** (in the `$schema` / JSON Schema file's own version field): the version of the schema definition. Bumped when the schema shape changes (new fields, changed constraints). Stored in the schema file itself, not in the manifest.

These are independent. A manifest may stay at `version: "1.2.0"` while the schema is bumped from `2.0.0` to `2.1.0` (additive field addition), and vice versa.

## Risks / Trade-offs

- **DSL creep** → Mitigation: closed `type` enum; new types require a library PR, not a manifest edit.
- **FE/BE schema drift** → Mitigation: single JSON Schema in `nextcloud-vue` is the contract; CI validates manifests against it (hydra#195).
- **Vue 2 reactivity with merged objects** → Mitigation: `useAppManifest` uses `Vue.set`-safe deep merge; the returned manifest is the source of truth reactive ref.
- **Debuggability of dynamic pages** → Mitigation: `CnPageRenderer` adds `data-page-id="<page.id>"` to its root element and sets `this.$options.name = 'CnPageRenderer:' + page.id` for Vue devtools.
- **Migration churn** → Mitigation: four adoption tiers allow incremental migration; pilot one app first (decidesk); existing apps keep working unchanged.
- **`t` being undefined at render** → Mitigation: `CnAppRoot` defaults `t` to `(key) => key` (identity function) so untranslated keys still render rather than crashing.
- **Loading/dependency-check screens** → Mitigation: `CnAppLoading` and `CnDependencyMissing` are library-provided defaults; both are slot-overridable on `CnAppRoot` for apps with custom branding.
- **Capabilities API availability** → Mitigation: `useAppStatus(appId)` caches the result per `appId` for the page lifetime; on error it defaults to `{ installed: false, enabled: false }` with a `console.warn`.

## File Structure

```
src/
  components/
    CnAppRoot/
      CnAppRoot.vue
      index.js
    CnAppNav/
      CnAppNav.vue
      index.js
    CnPageRenderer/
      CnPageRenderer.vue
      index.js
    CnAppLoading/
      CnAppLoading.vue      (loading screen; used by CnAppRoot #loading slot)
      index.js
    CnDependencyMissing/
      CnDependencyMissing.vue  (dependency-check screen; used by CnAppRoot #dependency-missing slot)
      index.js
  composables/
    useAppManifest.js
    useAppStatus.js     (generic — checks any Nextcloud app installed/enabled via capabilities; cached per appId)
  schemas/
    app-manifest.schema.json
  types/
    manifest.d.ts        (generated; committed for IDE support)
  components/index.js    (barrel — add five new components)
  index.js               (barrel — add useAppManifest, useAppStatus + new components)
```

## Nextcloud Integration

- **`@nextcloud/axios`** — used in `useAppManifest` for the BE fetch (inherits Nextcloud CSRF token automatically)
- **`@nextcloud/router`** — `generateUrl('/apps/{appId}/api/manifest')` for the default endpoint URL (overridable via `options.endpoint`)
- **`@nextcloud/capabilities`** — used in `useAppStatus(appId)` to check whether a given Nextcloud app is installed and enabled (called once per `manifest.dependencies` entry)
- **`NcContent`** — `CnAppRoot` wraps `NcContent` as per Nextcloud app template
- **`NcAppNavigation`, `NcAppNavigationItem`, `NcAppNavigationSpacer`** — used inside `CnAppNav`
- **`NcLoadingIcon`** — used inside `CnAppLoading` for the spinner
- No new OCP interfaces, DI services, or PHP annotations (this is purely a frontend library change)

## Seed Data

**N/A** — No OpenRegister schemas introduced. No seed data required.

## Migration Plan

1. Ship `@conduction/nextcloud-vue` with new exports (additive, no existing consumers break)
2. Pilot adoption: create `manifest.json` for one app (decidesk) at the tier that fits (recommend Tier 2 first), verify
3. Soak period: one sprint with decidesk running in production before migrating others
4. Roll out per-app migration changes for remaining consumers at their appropriate tier (separate change per app)

Apps with custom menus (e.g. mydash) can adopt Tier 4 using the `#menu` slot rather than replacing their existing menu component. Apps that only want manifest-driven pages without the full shell start at Tier 2. See `docs/migrating-to-manifest.md` for code snippets for each tier.

Rollback: pin consuming apps to prior npm version. Library change is purely additive.

## Open Questions

None blocking implementation. See DEFERRED_QUESTIONS section at end of specs artifact.
