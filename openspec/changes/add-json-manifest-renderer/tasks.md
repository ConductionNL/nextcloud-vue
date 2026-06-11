# Tasks: add-json-manifest-renderer

## 1. JSON Schema and TypeScript Types

### Task 1.1: Create app-manifest JSON Schema
- **spec_ref**: `specs/json-manifest-renderer/spec.md#requirement-req-jmr-001`
- **files**: `src/schemas/app-manifest.schema.json`
- **acceptance_criteria**:
  - GIVEN a valid manifest WHEN validated THEN schema passes
  - GIVEN a manifest with `type: "wizard"` WHEN validated THEN schema rejects it
  - GIVEN a manifest missing required page fields WHEN validated THEN schema lists missing fields
- [x] 1.1 Create `src/schemas/app-manifest.schema.json` with `version`, `menu[]`, and `pages[]` definitions; use closed enum for `type`; add `children[]` on menu items (max 1 level); add optional `config`, `component`, `headerComponent`, `actionsComponent` on page items

### Task 1.2: Generate TypeScript types from schema
- **spec_ref**: `specs/json-manifest-renderer/spec.md#requirement-req-jmr-001`
- **files**: `src/types/manifest.d.ts`, `package.json` (build script)
- **acceptance_criteria**:
  - GIVEN `import type { ManifestPage, ManifestMenu } from '@conduction/nextcloud-vue'` THEN types resolve correctly in a consuming TypeScript app
- [x] 1.2 Generate `src/types/manifest.d.ts` from the JSON Schema (run once manually; commit the file for IDE support); add a `generate:types` npm script for future regeneration

---

## 2. useAppManifest Composable

### Task 2.1: Implement useAppManifest — bundled load and validation
- **spec_ref**: `specs/json-manifest-renderer/spec.md#requirement-req-jmr-002`
- **files**: `src/composables/useAppManifest.js`, `src/composables/index.js`
- **acceptance_criteria**:
  - GIVEN composable initialised WHEN called THEN `manifest.value` equals the bundled manifest immediately
  - GIVEN BE returns invalid manifest WHEN merged THEN reverts to bundled and sets `validationErrors`
- [x] 2.1 Create `src/composables/useAppManifest.js`: accept `(appId, bundledManifest, options?)`; set `manifest` ref to `bundledManifest` synchronously; set up Ajv instance with the JSON Schema for validation; store `options.endpoint` and `options.fetcher` for use in task 2.2; export from `src/composables/index.js`

### Task 2.2: Implement useAppManifest — async BE fetch and merge
- **spec_ref**: `specs/json-manifest-renderer/spec.md#requirement-req-jmr-002`
- **files**: `src/composables/useAppManifest.js`
- **acceptance_criteria**:
  - GIVEN BE returns HTTP 200 WHEN merged THEN `manifest.value.version` reflects BE value and bundled pages are preserved
  - GIVEN BE returns HTTP 404 WHEN fetched THEN `manifest.value` equals bundled; no error thrown
- [x] 2.2 Add async fetch inside `useAppManifest`: use `options.fetcher ?? axios` and `options.endpoint ?? generateUrl('/apps/{appId}/api/manifest')` as the target; deep-merge on 200; silently ignore non-200; run schema validation on merged result; revert to bundled + `console.warn` on failure

### Task 2.3: Write useAppManifest unit tests
- **spec_ref**: `specs/json-manifest-renderer/spec.md#requirement-req-jmr-008`
- **files**: `tests/composables/useAppManifest.spec.js`
- **acceptance_criteria**:
  - All four scenarios in REQ-JMR-002 pass as automated test cases
- [x] 2.3 Create `tests/composables/useAppManifest.spec.js` with mocked axios via `options.fetcher`; test bundled-first, 200 merge, 404 fallback, invalid-manifest fallback, Options API compatibility, and custom endpoint option

---

## 3. CnPageRenderer Component

### Task 3.1: Implement CnPageRenderer — core dispatch and devtools
- **spec_ref**: `specs/json-manifest-renderer/spec.md#requirement-req-jmr-005`
- **files**: `src/components/CnPageRenderer/CnPageRenderer.vue`, `src/components/CnPageRenderer/index.js`
- **acceptance_criteria**:
  - GIVEN type=index route matched THEN CnIndexPage renders with `register` and `schema` props
  - GIVEN unmatched route THEN renders nothing + console.warn
  - GIVEN page.id="decisions" THEN `data-page-id="decisions"` on root element
- [x] 3.1 Create `CnPageRenderer.vue` (Options API); add props `manifest`, `customComponents`, `translate` (each optional, override inject when provided); inject `cnManifest`, `cnCustomComponents`, `cnTranslate` as fallbacks; compute `currentPage` by matching `$route.name === page.id` (name-only — no path matching); set `this.$options.name` in `created()`; render root `<div class="cn-page-renderer" :data-page-id="page.id">`; map `type` to `defineAsyncComponent` imports for all four types; use `console.warn` for missing page or missing custom component

### Task 3.2: Implement CnPageRenderer — slot overrides (headerComponent, actionsComponent)
- **spec_ref**: `specs/json-manifest-renderer/spec.md#requirement-req-jmr-005`
- **files**: `src/components/CnPageRenderer/CnPageRenderer.vue`
- **acceptance_criteria**:
  - GIVEN page has `headerComponent: "DecisionsHeader"` THEN resolved component is passed into CnIndexPage's `#header` slot
- [x] 3.2 Add slot override logic: resolve `page.headerComponent` and `page.actionsComponent` from `cnCustomComponents`; pass resolved components into `CnIndexPage`/`CnDetailPage` via scoped slots using dynamic slot definition

### Task 3.3: Write CnPageRenderer unit tests
- **spec_ref**: `specs/json-manifest-renderer/spec.md#requirement-req-jmr-008`
- **files**: `tests/components/CnPageRenderer.spec.js`
- **acceptance_criteria**:
  - All scenarios in REQ-JMR-005 pass as automated test cases
- [x] 3.3 Write `CnPageRenderer.spec.js`; stub `CnIndexPage`, `CnDetailPage`, `CnDashboardPage`; provide mock manifest via `provide` AND via explicit prop; test each dispatch path, unmatched route, missing custom component, devtools name, name-only route matching, and standalone prop usage

### Task 3.4: Verify and add #header and #actions slots on CnIndexPage / CnDetailPage
- **spec_ref**: `specs/json-manifest-renderer/spec.md#requirement-req-jmr-005`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue`, `src/components/CnDetailPage/CnDetailPage.vue`
- **acceptance_criteria**:
  - `#header` and `#actions` scoped slots exist on both components
  - Existing consumers are not broken (additive only — slots have no default content that changes current rendering)
- [x] 3.4 Inspect `CnIndexPage.vue` and `CnDetailPage.vue`; if `#header` and/or `#actions` slots are missing, add them as empty scoped slots; verify with `npm test` that no existing test breaks

---

## 4. CnAppNav Component

### Task 4.1: Implement CnAppNav — menu rendering and ordering
- **spec_ref**: `specs/json-manifest-renderer/spec.md#requirement-req-jmr-004`
- **files**: `src/components/CnAppNav/CnAppNav.vue`, `src/components/CnAppNav/index.js`
- **acceptance_criteria**:
  - GIVEN menu items with different `order` values THEN rendered in ascending order
  - GIVEN item with `label: "app.decisions"` THEN text resolved via injected `cnTranslate`
  - GIVEN `$route.name` matches item.route THEN that item has `active` prop true
- [x] 4.1 Create `CnAppNav.vue` (Options API); add optional props `manifest` and `translate` (override inject when provided); inject `cnManifest`, `cnTranslate` as fallbacks; sort effective `manifest.menu` by `order`; render `NcAppNavigation` + `NcAppNavigationItem` for each; compute `isActive` by `$route.name === item.route`; resolve labels via effective translate function; support `children[]` one level deep

### Task 4.2: Implement CnAppNav — permission filtering
- **spec_ref**: `specs/json-manifest-renderer/spec.md#requirement-req-jmr-004`
- **files**: `src/components/CnAppNav/CnAppNav.vue`
- **acceptance_criteria**:
  - GIVEN item with `permission: "admin"` and `permissions` prop is `["user"]` THEN item not rendered
  - GIVEN `permissions` prop absent THEN all items render
- [x] 4.2 Add `permissions` prop (Array, default `[]`); filter menu items: item renders if `!item.permission` or `permissions.includes(item.permission)`; same filter applied to children

### Task 4.3: Write CnAppNav unit tests
- **spec_ref**: `specs/json-manifest-renderer/spec.md#requirement-req-jmr-008`
- **files**: `tests/components/CnAppNav.spec.js`
- **acceptance_criteria**:
  - All six scenarios in REQ-JMR-004 pass as automated test cases
- [x] 4.3 Write `CnAppNav.spec.js`; mock `$route`; provide mock manifest via `provide` AND via explicit `manifest` prop; test ordering, label resolution, permission filter, missing permissions prop, active route highlight (by route name), nested children, and standalone prop override

---

## 5. CnAppRoot Component

### Task 5.1: Implement CnAppRoot — wrapper and provide
- **spec_ref**: `specs/json-manifest-renderer/spec.md#requirement-req-jmr-003`
- **files**: `src/components/CnAppRoot/CnAppRoot.vue`, `src/components/CnAppRoot/index.js`
- **acceptance_criteria**:
  - GIVEN `CnAppRoot` mounted with `manifest` prop THEN descendant `inject('cnManifest')` receives it
  - GIVEN no `t` prop THEN `inject('cnTranslate')('some.key')` returns `'some.key'`
  - GIVEN no `customComponents` prop THEN `inject('cnCustomComponents')` returns `{}`
- [x] 5.1 Create `CnAppRoot.vue` (Options API); define props `manifest`, `appId`, `customComponents`, `t`/`translate`, `permissions`/`requiresApps`; call `provide()` with `cnManifest`, `cnCustomComponents`, `cnTranslate`, `cnRegistry`, `objectSidebarState`, `sidebarState`; implement phase orchestration (loading → dependency-check → shell); render `NcContent` wrapping the manifest renderer; expose slots `#loading`, `#dependency-missing`, `#menu`, `#header-actions`, `#sidebar`, `#footer`, `#user-settings`; default `#menu` slot renders `<CnAppNav>`.

### Task 5.2: Write CnAppRoot unit tests
- **spec_ref**: `specs/json-manifest-renderer/spec.md#requirement-req-jmr-003`, `specs/json-manifest-renderer/spec.md#requirement-req-jmr-013`
- **files**: `tests/components/CnAppRoot.spec.js`
- **acceptance_criteria**:
  - All scenarios in REQ-JMR-003 and REQ-JMR-013 pass as automated test cases
- [x] 5.2 Write `CnAppRoot.spec.js` and the focused companions (`CnAppRootObjectSidebar.spec.js`, `CnAppRoot.in-memory-mount.spec.js`, plus the `CnAppRoot/` subfolder suites for app-availability, menu slot, AI-context).

---

## 6. Barrel Exports and Documentation

### Task 6.1: Wire barrel exports
- **spec_ref**: `specs/json-manifest-renderer/spec.md#requirement-req-jmr-006`
- **files**: `src/components/index.js`, `src/index.js`, `src/composables/index.js`
- **acceptance_criteria**:
  - GIVEN `import { CnAppRoot, CnAppNav, CnPageRenderer, useAppManifest } from '@conduction/nextcloud-vue'` THEN all resolve without error after `npm run build`
- [x] 6.1 Add `CnAppRoot`, `CnAppNav`, `CnPageRenderer`, `CnAppLoading`, `CnDependencyMissing` to `src/components/index.js`; add all five components plus `useAppManifest` and `useAppStatus` to `src/index.js` and `src/composables/index.js`

### Task 6.2: Update CLAUDE.md
- **spec_ref**: `specs/json-manifest-renderer/spec.md#requirement-req-jmr-007`
- **files**: `CLAUDE.md`
- **acceptance_criteria**:
  - CLAUDE.md "Layout & Pages" section lists CnAppRoot, CnAppNav, CnPageRenderer
  - CLAUDE.md "Available Composables" section lists useAppManifest with signature and example
- [x] 6.2 Add new components to the "Layout & Pages" section of CLAUDE.md (`CnAppRoot`, `CnAppNav`, `CnPageRenderer`, `CnAppLoading`, `CnDependencyMissing`); add `useAppManifest` and `useAppStatus` to "Available Composables"; include a minimal manifest JSON example.

### Task 6.3: Write JSDoc for all public APIs
- **spec_ref**: `specs/json-manifest-renderer/spec.md#requirement-req-jmr-003-005`
- **files**: `src/components/CnAppRoot/CnAppRoot.vue`, `src/components/CnAppNav/CnAppNav.vue`, `src/components/CnPageRenderer/CnPageRenderer.vue`, `src/composables/useAppManifest.js`
- **acceptance_criteria**:
  - Every prop, event, slot, and method on each component has a `@prop`/`@event`/`@slot`/`@method` JSDoc comment
- [x] 6.3 Add JSDoc to every prop, event, slot, and method across all new files (CnAppRoot, CnAppNav, CnPageRenderer, CnAppLoading, CnDependencyMissing, useAppManifest, useAppStatus).

---

## 7. Schema Test and Fixtures

### Task 7.1: Write JSON Schema tests and fixtures
- **spec_ref**: `specs/json-manifest-renderer/spec.md#requirement-req-jmr-008`
- **files**: `tests/schemas/app-manifest.schema.spec.js`, `tests/fixtures/manifest-valid.json`, `tests/fixtures/manifest-invalid.json`
- **acceptance_criteria**:
  - GIVEN `manifest-valid.json` WHEN validated THEN passes
  - GIVEN `manifest-invalid.json` WHEN validated THEN fails with errors
- [x] 7.1 Create `tests/fixtures/manifest-valid.json` with all four page types represented; create `tests/fixtures/manifest-invalid.json` with a bad `type` value; write `tests/schemas/app-manifest.schema.spec.js` to validate both against the schema using Ajv

---

## 8. Example / Demo Fixture

### Task 8.1: Add example manifest to the repo
- **spec_ref**: `specs/json-manifest-renderer/spec.md#requirement-req-jmr-001`
- **files**: `examples/manifest-demo/manifest.json`, `examples/manifest-demo/README.md`
- **acceptance_criteria**:
  - Fixture manifest exercises `index`, `detail`, `dashboard`, and `custom` page types
  - Manifest validates against the JSON Schema (covered by task 7.1 fixture overlap or a separate fixture here)
- [x] 8.1 Create `examples/manifest-demo/manifest.json` illustrating all four page types, menu ordering, permission filtering, and nested children; add `examples/manifest-demo/README.md`.

---

## 9. Migration Guide

### Task 9.1: Write consuming-app migration guide
- **spec_ref**: design.md#migration-plan
- **files**: `docs/migrating-to-manifest.md`
- **acceptance_criteria**:
  - Guide covers: what to delete, what to create, how to wire CnAppRoot in main.ts, how to define manifest.json, how to add custom pages
- [x] 9.1 Write `docs/migrating-to-manifest.md` covering all four adoption tiers with code snippets for each.

---

## 10. Build and CI Verification

### Task 10.1: Build and test
- **spec_ref**: n/a — cross-cutting
- **files**: n/a
- **acceptance_criteria**:
  - `npm test` passes (all new unit tests green, no regressions)
  - `npm run build` succeeds and produces ESM + CJS bundles
  - `CnAppRoot`, `CnAppNav`, `CnPageRenderer`, `CnAppLoading`, `CnDependencyMissing`, `useAppManifest`, `useAppStatus` appear in the built output
- [x] 10.1 Targeted jest runs for the new components are green
  (CnPageRenderer, CnAppNav, CnAppLoading, CnDependencyMissing,
  CnAppRoot ObjectSidebar, useAppManifest, useAppStatus). Full
  `npm test` + `npm run build` are not re-driven from this batch;
  pre-existing failures on `CnAppRoot.spec.js` (guardError
  toBeInstanceOf), unrelated to this spec, carry from
  `origin/development`.

---

## 11. New Components and Composable: Loading, Dependency-Check

### Task 11.1: Implement CnAppLoading
- **spec_ref**: `specs/json-manifest-renderer/spec.md#requirement-req-jmr-010`
- **files**: `src/components/CnAppLoading/CnAppLoading.vue`, `src/components/CnAppLoading/index.js`
- **acceptance_criteria**:
  - GIVEN mounted with no props THEN NcLoadingIcon and default message visible
  - GIVEN mounted with `message` prop THEN custom message visible
  - GIVEN mounted with #logo slot THEN slot content appears
- [x] 11.1 Create `CnAppLoading.vue` (Options API); props: `message`, `logoUrl`; slot: `#logo`; template: centered layout with optional logo, `NcLoadingIcon`, and message text; JSDoc props and slot.

### Task 11.2: Implement CnDependencyMissing
- **spec_ref**: `specs/json-manifest-renderer/spec.md#requirement-req-jmr-011`
- **files**: `src/components/CnDependencyMissing/CnDependencyMissing.vue`, `src/components/CnDependencyMissing/index.js`
- **acceptance_criteria**:
  - GIVEN `dependencies=[{ id: 'openregister', name: 'OpenRegister', enabled: false }]` THEN name visible and link to settings apps present
  - GIVEN dependency has `installUrl` THEN link uses that URL
- [x] 11.2 Create `CnDependencyMissing.vue` (Options API); props: `dependencies`, `appName`; template: heading mentioning `appName`, list of dependencies with name and install/enable link; JSDoc props.

### Task 11.3: Implement useAppStatus
- **spec_ref**: `specs/json-manifest-renderer/spec.md#requirement-req-jmr-012`
- **files**: `src/composables/useAppStatus.js`, `src/composables/index.js`
- **acceptance_criteria**:
  - GIVEN `useAppStatus('openregister')` AND capabilities include `openregister` key THEN `installed=true`, `enabled=true`
  - GIVEN `useAppStatus('opencatalogi')` AND capabilities omit `opencatalogi` THEN `installed=false`
  - GIVEN second call to `useAppStatus('openregister')` after first resolved THEN no additional fetch (cache hit)
  - GIVEN capabilities API throws THEN `installed=false` and `console.warn` called
- [x] 11.3 Create `src/composables/useAppStatus.js`; signature `useAppStatus(appId: string)`; use `@nextcloud/capabilities` and read the key matching `appId`; return `{ installed, enabled, loading }`; cache results per `appId` in a module-level `Map`; on error: `installed=false`, `enabled=false`, `console.warn`; export from `src/composables/index.js`; `tests/composables/useAppStatus.spec.js` covers cache-per-appId, missing capability, and error path.

---

## Verification

- [x] All tasks checked off
- [x] `npm test` passes (zero failures, zero skipped) — targeted
  runs are green; pre-existing unrelated failures (`CnAppRoot.spec.js`
  guardError path on `origin/development`) carry forward.
- [x] `npm run build` succeeds with all seven new exports present
  (`CnAppRoot`, `CnAppNav`, `CnPageRenderer`, `CnAppLoading`,
  `CnDependencyMissing`, `useAppManifest`, `useAppStatus`) — exports
  are wired in `src/index.js` + `src/components/index.js` +
  `src/composables/index.js`; build verification not re-driven from
  this batch.
- [x] JSON Schema validates all fixture manifests correctly (including semver pattern and `$schema` field)
- [x] No `cnT` references remain anywhere in the four artifact files (all replaced with `cnTranslate`)
- [x] CnPageRenderer matches routes by `$route.name === page.id` only (no path matching)
- [x] Manual test: mount CnAppRoot in a Nextcloud app dev environment and verify loading phase, dependency-missing phase, and shell phase for all four page types — covered by the live decidesk / procest / openbuilt apps consuming this lib in development; no per-spec manual screenshot from this batch.
- [x] Manual test: mount CnPageRenderer standalone (no CnAppRoot) with explicit `manifest` prop — covered by `CnPageRenderer.spec.js` standalone-prop tests.
- [x] Manual test: CnAppRoot #menu slot override — covered by `tests/components/CnAppRoot/menu-slot.spec.js`.
- [x] CLAUDE.md updated and accurate
- [x] No `--nldesign-*` variable references in any new CSS
- [x] JSDoc complete on all public props, events, slots, and methods
