## 1. Bug fixes (B1, B2, B3) — land first as standalone PRs if needed

- [x] 1.1 B1: Add `inheritAttrs: false` to `CnPageRenderer` and forward `v-on="$listeners"` + `v-bind="$attrs"` to the dispatched `resolvedComponent` (in addition to the existing `:is`, `:key`, `:resolvedProps`). Spec ref: `app-nav-shell` → "page renderer forwards parent listeners and attributes". Files: `src/components/CnPageRenderer/CnPageRenderer.vue`.
- [x] 1.2 B1 tests: add `tests/components/CnPageRenderer.spec.js` cases for (a) listener bubble through the page component, (b) `$attrs` reaching the page, (c) explicit prop binding still wins over `$attrs`. Files: `tests/components/CnPageRenderer.spec.js`.
- [x] 1.3 B2: add `showRefresh` (Boolean, default `true`) and `showRequestFeature` (Boolean, default `true`) props to `CnWidgetWrapper` for per-instance opt-out. Files: `src/components/CnWidgetWrapper/CnWidgetWrapper.vue`.
- [x] 1.4 B2: add `cnAppId` and `cnFeatureRequestRepo` provides on `CnAppRoot` (both come from manifest top-level — `manifest.appId` and `manifest.nav.featureRequestRepo` with fallback to `manifest.appId` mapping). Files: `src/components/CnAppRoot/CnAppRoot.vue`.
- [x] 1.5 B2: implement default Request-a-feature handler in `CnWidgetWrapper` — mounts and opens `CnSuggestFeatureModal` with auto-filled `app`, `page` (`$route.name`), `surface` (`widget:${widgetId}`), `repo`, `specRef`, `conductionSubmitEnabled: false`. Spec ref: `widget-wrapper-actions` → "default Request-a-feature handler". Files: `src/components/CnWidgetWrapper/CnWidgetWrapper.vue`.
- [x] 1.6 B2: implement default Refresh handler in `CnWidgetWrapper` — emits on `@nextcloud/event-bus` channel `cn:widget:refresh` with `{ widgetId, title }`. Use `import { emit } from '@nextcloud/event-bus'`. Spec ref: `widget-wrapper-actions` → "default Refresh handler". Files: `src/components/CnWidgetWrapper/CnWidgetWrapper.vue`.
- [x] 1.7 B2: respect `event.preventDefault()` on both `@refresh` and `@request-feature` so host listeners can suppress defaults. Verify emit order: host listener fires first, then default checks `event.defaultPrevented`. Files: `src/components/CnWidgetWrapper/CnWidgetWrapper.vue`.
- [x] 1.8 B2 tests: expand `tests/components/CnWidgetWrapper.spec.js` with (a) default opens modal with expected props, (b) host listener with `preventDefault` suppresses modal, (c) missing inject falls back with `console.warn` and no error, (d) Refresh default emits on bus with correct payload, (e) `showRefresh: false` hides only that entry, (f) both opted out → menu hidden. Files: `tests/components/CnWidgetWrapper.spec.js`.
- [x] 1.9 B3 (docs): write the "Opting into Refresh" section in `docs/components/cn-widget-wrapper.md` covering the three modes (`refreshTrigger` reactive prop, ref-callable `refresh()` method, event-bus subscription); label the ref-callable method as canonical. Files: `docs/components/cn-widget-wrapper.md`.

## 2. Three-section menu model in CnAppNav

- [ ] 2.1 Update `TManifestMenuSection` type union to `'main' | 'footer' | 'settings'` and document each in the JSDoc on `TManifestMenuItemLeaf.section`. Files: `src/types/manifest.d.ts`.
- [ ] 2.2 Update `app-manifest.schema.json` so `menu[].section` accepts the new `"footer"` value. Run `npm run build:validators` to regenerate `src/utils/validateManifestV2.compiled.js`. Files: `src/schemas/app-manifest.schema.json`, `src/utils/validateManifestV2.compiled.js`.
- [ ] 2.3 Add `footerItems` computed to `CnAppNav`: `visibleItems.filter(i => i.section === 'footer')`. Files: `src/components/CnAppNav/CnAppNav.vue`.
- [ ] 2.4 Update `settingsItems` computed semantics — same filter, but the template wiring now places them INSIDE an `NcAppNavigationSettings` foldout rather than a flat `<ul>`. Files: `src/components/CnAppNav/CnAppNav.vue`.
- [ ] 2.5 In the `#footer` slot template: render `footerItems` as flat `NcAppNavigationItem`s first, then mount `<NcAppNavigationSettings>` if `settingsItems.length > 0` OR `!suppressPersonalSettings`. The foldout's default slot contains the auto-prepended Personal-settings entry followed by each settings item. Files: `src/components/CnAppNav/CnAppNav.vue`.
- [ ] 2.6 Implement the auto-prepended Personal-settings entry: `NcAppNavigationItem` with name `t('nextcloud-vue', 'Personal settings')`, MDI icon `Cog` (registered key), `@click` invokes `cnOpenUserSettings` (existing inject). Gated by manifest field `manifest.nav.includePersonalSettings` (default `true`). Files: `src/components/CnAppNav/CnAppNav.vue`.
- [ ] 2.7 Spec ref tests in `tests/components/CnAppNav.spec.js`: (a) `footer`-section item renders above the foldout, (b) `settings`-section item renders inside the foldout, (c) Personal-settings auto-prepended at index 0, (d) `includePersonalSettings: false` suppresses Personal-settings, (e) no settings items + suppress → no foldout, (f) missing `section` defaults to `main`. Files: `tests/components/CnAppNav.spec.js`.

## 3. Primary action above menu list

- [ ] 3.1 Add optional `primaryAction` field to manifest types: `{ id: string, label: string, icon?: string, payload?: any }` on both `TManifestPage` and on a new top-level `TManifestNav` block (`manifest.nav.primaryAction` for app-wide default). Files: `src/types/manifest.d.ts`.
- [ ] 3.2 Extend `app-manifest.schema.json` to accept `pages[].primaryAction` and `nav.primaryAction`. Regenerate compiled validator. Files: `src/schemas/app-manifest.schema.json`, `src/utils/validateManifestV2.compiled.js`.
- [ ] 3.3 Add `activePrimaryAction` computed to `CnAppNav`: matches the manifest page whose id equals `$route.name`; returns that page's `primaryAction` when present, else falls back to `manifest.nav.primaryAction`, else null. Files: `src/components/CnAppNav/CnAppNav.vue`.
- [ ] 3.4 Template: when `activePrimaryAction` is non-null, render `<NcAppNavigationNew>` in the top of the `#list` slot with `:text="resolveLabel(activePrimaryAction.label)"`, `@click="$emit('primary-action', { id: activePrimaryAction.id, payload: activePrimaryAction.payload, page: $route.name })"`, and an MDI icon resolved by `mdiIconComponent` (default `Plus` when no icon set). Files: `src/components/CnAppNav/CnAppNav.vue`.
- [ ] 3.5 Document the `@primary-action` event on `CnAppNav` (JSDoc above `this.$emit` site). Files: `src/components/CnAppNav/CnAppNav.vue`.
- [ ] 3.6 Tests: (a) page-scoped primary action renders + emits, (b) menu-root default renders when page has none, (c) page-scoped wins when both present, (d) no primary action → `NcAppNavigationNew` not in DOM, (e) icon defaults to `Plus` when icon field missing. Files: `tests/components/CnAppNav.spec.js`.

## 4. Per-item counter badges

- [ ] 4.1 Add optional `count: number | "auto"` field to `TManifestMenuItemLeaf`. JSDoc explains the two binding modes. Files: `src/types/manifest.d.ts`.
- [ ] 4.2 Extend `app-manifest.schema.json` accordingly; regenerate compiled validator. Files: `src/schemas/app-manifest.schema.json`, `src/utils/validateManifestV2.compiled.js`.
- [ ] 4.3 Add `resolveCount(item)` method on `CnAppNav`: returns `item.count` if it's a positive number; if `"auto"`, looks up the matching page (via `pageForItem`), and when that page is `type: "index"` with a `register/schema` config, returns `this.cnMenuCounts?.[register]?.[schema] ?? null`. Returns `null` when no count resolvable. Files: `src/components/CnAppNav/CnAppNav.vue`.
- [ ] 4.4 Inject `cnMenuCounts` on `CnAppNav` (provided by `CnAppRoot` — see 4.5). Files: `src/components/CnAppNav/CnAppNav.vue`.
- [ ] 4.5 In `CnAppRoot`: on mount, scan `manifest.menu` (including `children[]`) for items with `count: "auto"`; for each matching index page, call `useObjectStore(...).fetchIndex({ limit: 1 })` to populate `totals` cache; expose a reactive `cnMenuCounts: { [register]: { [schema]: number } }` provide derived from the store's `totals` Maps. Files: `src/components/CnAppRoot/CnAppRoot.vue`.
- [ ] 4.6 Template: when `resolveCount(item)` returns a positive number, render `<NcCounterBubble :count="resolveCount(item)" :active="isActive(item)" />` in `NcAppNavigationItem`'s `#counter` slot. Zero → render nothing. Files: `src/components/CnAppNav/CnAppNav.vue`.
- [ ] 4.7 Tests: (a) literal count renders bubble, (b) `count: "auto"` resolves from `cnMenuCounts` inject, (c) zero count → no bubble, (d) auto + no matching index page → no bubble. Files: `tests/components/CnAppNav.spec.js`.
- [ ] 4.8 Optional store coverage test in `tests/components/CnAppRoot.spec.js`: with a manifest containing `count: "auto"`, mounting `CnAppRoot` triggers a single index-fetch per `(register, schema)` pair and exposes the totals via the `cnMenuCounts` inject. Mock the store. Files: `tests/components/CnAppRoot.spec.js`.

## 5. Smaller surface gaps

- [ ] 5.1 Nested children rendering: in `CnAppNav` template, wire `:allow-collapse="visibleChildren(item).length > 0"` and bind the parent item's `open` to a per-item local state (track via `Set<id>`). Mount nested `NcAppNavigationItem`s inside the parent's `#default` slot. Files: `src/components/CnAppNav/CnAppNav.vue`.
- [ ] 5.2 Add `#search` slot pass-through: declare `<slot name="search" />` inside `NcAppNavigation`'s `#search` slot. Files: `src/components/CnAppNav/CnAppNav.vue`.
- [ ] 5.3 Add per-item `#item-{id}-actions` scoped slot pass-through: inside the loop, `<template #actions><slot :name="\`item-${item.id}-actions\`" :item="item" /></template>`. Files: `src/components/CnAppNav/CnAppNav.vue`.
- [ ] 5.4 Per-item `pinned: true` prop pass-through to `NcAppNavigationItem`. Update manifest types + schema. Files: `src/types/manifest.d.ts`, `src/schemas/app-manifest.schema.json`, `src/components/CnAppNav/CnAppNav.vue`.
- [ ] 5.5 `type: "caption"` menu entries: detect `item.type === 'caption'` in the loop and render `<NcAppNavigationCaption :name="resolveLabel(item)" />` instead of `NcAppNavigationItem`. Update types + schema. Files: `src/types/manifest.d.ts`, `src/schemas/app-manifest.schema.json`, `src/components/CnAppNav/CnAppNav.vue`.
- [ ] 5.6 Tests for each of 5.1–5.5 in `tests/components/CnAppNav.spec.js`. Files: `tests/components/CnAppNav.spec.js`.

## 6. JSDoc + reference docs

- [ ] 6.1 Add full JSDoc to every new prop, event, and slot across `CnAppNav.vue`, `CnPageRenderer.vue`, `CnWidgetWrapper.vue`, `CnAppRoot.vue`. Follow the three canonical JSDoc shapes from the nc-vue CLAUDE.md (prop with `@type`, event with `@event`, slot with template comment). Files: all four SFCs.
- [ ] 6.2 Update `docs/components/cn-app-nav.md` to describe the three-section model, the foldout, primaryAction, and counter badges. Document the `@primary-action` event signature. Files: `docs/components/cn-app-nav.md`.
- [ ] 6.3 Update `docs/components/cn-page-renderer.md` to document `$listeners` / `$attrs` forwarding semantics + the `inheritAttrs: false` decision. Files: `docs/components/cn-page-renderer.md`.
- [ ] 6.4 Update `docs/components/cn-widget-wrapper.md` to add the built-in defaults section + the "Opting into Refresh" section from task 1.9. Files: `docs/components/cn-widget-wrapper.md`.
- [ ] 6.5 Update `docs/components/cn-app-root.md` to document the new `cnAppId`, `cnFeatureRequestRepo`, and `cnMenuCounts` provides. Files: `docs/components/cn-app-root.md`.
- [ ] 6.6 Run `cd docusaurus && npm run prebuild:docs` to regenerate `docs/components/_generated/`. Commit the diff. Files: `docs/components/_generated/Cn*.md`.

## 7. Schema + manifest validator

- [ ] 7.1 Run `npm run build:validators` to regenerate `src/utils/validateManifestV2.compiled.js` from the updated schema. Files: `src/utils/validateManifestV2.compiled.js`.
- [ ] 7.2 Add manifest-validator test cases: (a) manifest with all new fields validates, (b) legacy manifest still validates, (c) `section: "invalid"` rejected. Files: `tests/utils/validateManifest.spec.js`.

## 8. Pre-merge gates

- [ ] 8.1 Run `npm test` and confirm green across CnAppNav, CnAppRoot, CnPageRenderer, CnWidgetWrapper, validateManifest.
- [ ] 8.2 Run `npm run check:docs` — confirm every new public export is documented.
- [ ] 8.3 Run `npm run check:jsdoc` — confirm no regression below the baseline; bump the baseline with `npm run jsdoc-baselines:update` if coverage improved. Commit the bumped baseline.
- [ ] 8.4 Run `npm run build` and confirm clean.
- [ ] 8.5 Open PR against `beta`. Body links to `openspec/changes/cn-app-nav-shell-refactor/proposal.md` and lists the spec capabilities touched.

## 9. Out-of-scope follow-up issues (file at PR-open time, do NOT implement in this change)

- [ ] 9.1 File issue: "Fleet rollout — migrate manifest section semantics" — one tracking issue plus one sub-issue per consuming app (procest, pipelinq, opencatalogi, decidesk, launchpad, softwarecatalog, larpingapp, scholiq, openconnector, openregister, docudesk). Each app PR moves Documentation/Features & Roadmap entries to `section: "footer"` and any real settings pages into `section: "settings"`. Repo: `ConductionNL/nextcloud-vue` (or per-app).
- [ ] 9.2 File issue: "Add NcAppSettingsDialog mounts where missing" — audit which apps already wire `cnOpenUserSettings` to a real dialog vs. fall back to the no-op default; create per-app issues to mount one where missing. Repo: per-app.
- [ ] 9.3 File issue: "Adopt counter badges across fleet" — for every consuming app's manifest, set `count: "auto"` on menu entries pointing at `type: "index"` pages. Repo: per-app.
- [ ] 9.4 File issue: "Adopt primaryAction across fleet" — for every consuming app's `type: "index"` pages, declare a `primaryAction` that maps to the page's create flow. Repo: per-app.
