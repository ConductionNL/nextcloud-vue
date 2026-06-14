## Why

A manifest page declared as `type: "detail"` with `{ register, schema, sidebarTabs, actionsComponent }` config today mounts `CnDetailPage` as a generic *layout shell*: the header is empty (the renderer never forwards `page.title`/`description`/`icon`), no object is fetched (CnDetailPage has no `register`/`schema` props), the manifest's `sidebarTabs` fall through as kebab-case DOM attributes (`sidebartabs="[object Object]..."`), and the body is blank unless the host app passes slot content. Browser-verified on openbuilt's `VirtualAppDetail` route (2026-05-13). Result: every consuming app has to write a per-route detail component instead of using `type: "detail"` end-to-end — defeating the manifest pattern.

CnIndexPage already closes this gap symmetrically (declares `register`/`schema`/`columns` props, fetches via `useObjectStore`, publishes its sidebar config to `cnIndexSidebarConfig` so `CnAppRoot` hoists `CnIndexSidebar` at NcContent level — ADR-017-compliant). The detail surface needs the same end-to-end wiring so manifest-only apps (openbuilt, decidesk, mydash, and the in-flight per-app journeydocs) get a working detail page without bespoke views.

## What Changes

- **`CnPageRenderer.vue`** — `resolvedProps` now also forwards `page.title`, `page.description`, `page.icon` (top-level fields) into the dispatched page component. `config.*` still overrides them on collision; `$route.params` still overrides `config.*`. Additive — no existing prop wins are reordered.
- **`CnDetailPage.vue`** — adds four props: `register: String`, `schema: String`, `sidebarTabs: Array`, and a derived `resolvedObjectType` computed (`objectType || (register && schema ? \`${register}-${schema}\` : '')`). When `register`+`schema` are set the page lazy-resolves `useObjectStore()`, calls `registerObjectType(slug, schemaId, registerId, { registerSlug, schemaSlug })` (the 4-arg signature we just landed for `CnIndexPage`/`CnLogsPage`), and `fetchObject(slug, objectId)` on mount + on `[register, schema, objectId]` watcher. The fetched object is exposed as `currentObject`. The existing `subscribe` + `useObjectLock` setup() block keeps working because `objectType` flows through `resolvedObjectType`.
- **`CnDetailPage.vue` (continued)** — when the default slot is empty AND `currentObject` is loaded, render `CnObjectDataWidget` + `CnObjectMetadataWidget` for the object as the body. Existing slot-using consumers see no change (their slot wins). `sidebarTabs` is written into the injected `objectSidebarState` (alongside `active`, `objectType`, `objectId`, `title`, `subtitle`, `register`, `schema`) via the existing `syncSidebarState()` watcher — ADR-017-compliant external sidebar.
- **`CnAppRoot.vue`** — auto-mount `<CnObjectSidebar v-if="objectSidebarState.active" :tabs="objectSidebarState.tabs" ... />` at NcContent level alongside the existing `cnIndexSidebarConfig` hoist (the in-file comment at line 181-182 already anticipated this). Eliminates per-app `#sidebar` boilerplate; the `#sidebar` slot still wins when consumer-supplied.
- **Documentation** — `docs/components/cn-detail-page.md`, `docs/components/cn-page-renderer.md`, `docs/components/cn-app-root.md` updated for the new props/behaviour. `check:docs` + `check:jsdoc` pass with the new props.

Non-breaking. Every existing call site of `CnDetailPage` that passes its own `title`/`description`/`icon`/`objectType`/`objectId` keeps working — config + params still override page-level defaults; the schema-driven path only activates when `register`+`schema` are present. Apps that already render `<CnObjectSidebar>` inside their `#sidebar` slot keep doing so (consumer slot wins over auto-mount).

## Capabilities

### New Capabilities

- `schema-driven-detail-page` — Manifest `type: "detail"` mounts `CnDetailPage` with the schema-driven contract: header from `page.title/description/icon`, object fetched from `register`+`schema`+`objectId` via the OR object store, body auto-renders data + metadata widgets when no slot is supplied, sidebar tabs flow through `objectSidebarState` to a CnAppRoot-hoisted `CnObjectSidebar`. Closes the parity gap with `CnIndexPage`.

### Modified Capabilities

_None._ The new capability is orthogonal to `detail-page-grid` (grid layout) and `use-detail-view` (composable); neither's existing requirements change. The `json-manifest-renderer` capability is still in-flight in `changes/add-json-manifest-renderer/` and has no settled `specs/` home yet — the CnPageRenderer change for `title`/`description`/`icon` forwarding is therefore captured inside the new capability rather than as a delta on a not-yet-existing spec.

## Impact

- **Affected code**: `src/components/CnPageRenderer/CnPageRenderer.vue` (resolvedProps), `src/components/CnDetailPage/CnDetailPage.vue` (props + fetch + auto-body), `src/components/CnAppRoot/CnAppRoot.vue` (CnObjectSidebar hoist), `docs/components/cn-{detail-page,page-renderer,app-root}.md`.
- **Affected consumers (immediate)**: openbuilt (`VirtualAppDetail` route works without a custom view), decidesk + mydash (existing detail routes keep working — auto-widgets only fire on empty slot).
- **Affected consumers (downstream)**: every Conduction app considering the manifest pattern (procest, pipelinq, opencatalogi, larpingapp, scholiq, deskdesk, docudesk, planix, zaakafhandelapp) — the detail surface becomes a one-line manifest entry.
- **ADR alignment**: ADR-017 (external-sidebar pattern enforced via CnAppRoot hoist), ADR-022 (object fetch through OR's objectStore, no direct axios), ADR-024 (manifest `type: "detail"` becomes truly closed-DSL — config is enough, no custom component required), ADR-031 (actions stay declarative via `actionsComponent` slot, unchanged).
- **No theming / NL Design impact**: uses existing Nextcloud CSS variables via the underlying widget components.
- **Dependencies**: `useObjectStore`, `CnObjectSidebar`, `CnObjectDataWidget`, `CnObjectMetadataWidget` — all already shipped from this library.
- **Test surface**: new unit tests for the schema-driven render path on CnDetailPage, the title/description/icon forwarding on CnPageRenderer, and the CnObjectSidebar auto-mount in CnAppRoot.
