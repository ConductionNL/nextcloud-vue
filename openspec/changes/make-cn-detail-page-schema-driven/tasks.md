## 1. CnPageRenderer — forward top-level title, description, icon

- [ ] 1.1 In `src/components/CnPageRenderer/CnPageRenderer.vue`, update `resolvedProps()` to spread `{ title: currentPage.title, description: currentPage.description, icon: currentPage.icon }` *before* `...page.config` and `...$route.params` (so config still overrides top-level fields and route params still override config). Keep existing JSDoc comment in sync with the new precedence order.
- [ ] 1.2 Extend the existing test in `tests/components/CnPageRenderer.spec.js` (or add a new spec) with three cases: (a) manifest with only top-level `title` → child receives it; (b) manifest with both top-level and `config.title` → config wins; (c) manifest with top-level + config + matching `$route.params` key → params win.
- [ ] 1.3 Update `docs/components/cn-page-renderer.md` to document the new forwarded keys and the precedence order. Run `npm run check:docs` and confirm zero new failures.

## 2. CnDetailPage — register, schema, sidebarTabs props + resolvedObjectType

- [ ] 2.1 In `src/components/CnDetailPage/CnDetailPage.vue`, add three props: `register: { type: String, default: '' }`, `schema: { type: String, default: '' }`, `sidebarTabs: { type: Array, default: () => [] }`. JSDoc each one (purpose, default behavior, link to the manifest contract).
- [ ] 2.2 Add a `resolvedObjectType` computed: `this.objectType || (this.register && this.schema ? \`${this.register}-${this.schema}\` : '')`. Replace `this.objectType` with `this.resolvedObjectType` in every internal reference — `setup()` block, `syncSidebarState()`, the lock + subscription wiring. Keep the `objectType` prop intact for backwards-compat.
- [ ] 2.3 Verify `setup()` still receives the right value by reading `props.objectType || (props.register && props.schema ? \`${props.register}-${props.schema}\` : '')` for the subscription/lock arguments. Avoid Vue 2 reactivity foot-guns: pass functions to the composables (already the existing pattern), not the materialised string.

## 3. CnDetailPage — schema-driven fetch via useObjectStore

- [ ] 3.1 Add a `hasSchemaDrivenFetch` computed: returns `true` iff `this.register && this.schema && this.objectId` are all non-empty. Use this to gate the fetch + auto-body behaviour.
- [ ] 3.2 Add a `effectiveObjectStore` computed mirroring `CnLogsPage.objectStore`: `this.objectStore || useObjectStore()` (only resolve when `hasSchemaDrivenFetch` is true to avoid touching Pinia in tests that don't activate it).
- [ ] 3.3 Add a `fetchObjectIfNeeded()` method that: (a) returns early if `!hasSchemaDrivenFetch`; (b) sets `loading: true`, clears `error`; (c) calls `effectiveObjectStore.registerObjectType(resolvedObjectType, schema, register, { registerSlug: register, schemaSlug: schema })` (guarded by `typeof === 'function'`); (d) `await effectiveObjectStore.fetchObject(resolvedObjectType, objectId)` (guarded the same way); (e) catches errors into `this.error`; (f) clears `loading` in finally.
- [ ] 3.4 Call `fetchObjectIfNeeded()` from `mounted()` and from new watchers on `register`, `schema`, `objectId`. Watcher handlers are simple `() => this.fetchObjectIfNeeded()`.
- [ ] 3.5 Add a `currentObject` computed: `effectiveObjectStore?.objects?.[resolvedObjectType]?.[objectId] ?? null` (or whatever the actual store getter path is — check `CnIndexPage` for the canonical access pattern).

## 4. CnDetailPage — auto-body with data + metadata widgets

- [ ] 4.1 Add a `hasDefaultSlotContent` computed: `!!(this.$slots.default && this.$slots.default.some(vnode => !(vnode.text && vnode.text.trim() === '')))`. Returns false for whitespace-only / empty slot.
- [ ] 4.2 Add a `shouldRenderAutoBody` computed: `this.hasSchemaDrivenFetch && this.currentObject && !this.hasDefaultSlotContent && !this.hasGridLayout`. (The grid-layout mode wins over auto-body to avoid stacked surprises.)
- [ ] 4.3 In the `.cn-detail-page__content` block of the template, render `<div v-if="shouldRenderAutoBody" class="cn-detail-page__auto-body"><CnObjectDataWidget :register="register" :schema="schema" :object-id="objectId" /><CnObjectMetadataWidget :register="register" :schema="schema" :object-id="objectId" /></div>` *before* the existing `<slot />`. The `v-else` on the slot keeps existing consumers untouched. Confirm the exact prop names CnObjectDataWidget + CnObjectMetadataWidget expect against their own SFCs before wiring.
- [ ] 4.4 Import + register `CnObjectDataWidget` and `CnObjectMetadataWidget` in the component's `components: { ... }` map.
- [ ] 4.5 CSS — add `.cn-detail-page__auto-body { display: flex; flex-direction: column; gap: 16px; }` scoped to the component. No new variables, no NL-design overrides.

## 5. CnDetailPage — sidebarTabs into objectSidebarState

- [ ] 5.1 Extend `syncSidebarState()` to write three additional fields: `tabs: this.sidebarTabs`, `register: this.register`, `schema: this.schema`. Keep the existing fields untouched.
- [ ] 5.2 Add a watcher on `sidebarTabs` calling `syncSidebarState()`. Existing watchers on `title`, `subtitle`, `objectType` stay.
- [ ] 5.3 Update the `beforeDestroy()` hook to reset `objectSidebarState.tabs = []` alongside the existing `active = false` reset.

## 6. CnAppRoot — auto-mount CnObjectSidebar at NcContent level

- [ ] 6.1 Import `CnObjectSidebar` at the top of `src/components/CnAppRoot/CnAppRoot.vue` and register it in `components: { ... }`.
- [ ] 6.2 Inject `objectSidebarState` with a default of `{ active: false, tabs: [], objectType: '', objectId: '', title: '', subtitle: '' }` (provide-default holder so the inject is never undefined in legacy hosts).
- [ ] 6.3 Below the existing `cnIndexSidebarConfig` hoist block (around line 184-188), add an auto-mount block:
  ```vue
  <CnObjectSidebar
      v-if="objectSidebarState.active && !$slots.sidebar"
      :tabs="objectSidebarState.tabs"
      :object-type="objectSidebarState.objectType"
      :object-id="objectSidebarState.objectId"
      :title="objectSidebarState.title"
      :subtitle="objectSidebarState.subtitle" />
  ```
- [ ] 6.4 Make sure the `provide()` block exposes `objectSidebarState` for descendants (so `CnDetailPage`'s existing inject resolves to the same holder). Use a reactive holder (`Vue.observable({...})` or a `ref`-style object) so writes from CnDetailPage trigger re-renders.
- [ ] 6.5 Confirm the slot-content guard: `!$slots.sidebar` keeps consumer-supplied sidebars in charge; document the precedence in the SFC comment block.

## 7. Documentation

- [ ] 7.1 Update `docs/components/cn-detail-page.md` with: new props (`register`, `schema`, `sidebarTabs`), schema-driven mode summary, auto-body behaviour, sidebar precedence note. Add a manifest example.
- [ ] 7.2 Update `docs/components/cn-app-root.md` with the new auto-mount block and the `#sidebar` precedence rule.
- [ ] 7.3 Run `npm run check:docs` and `npm run check:jsdoc`. Update the JSDoc baseline if any new prop / event / slot lifts coverage above the existing baseline.
- [ ] 7.4 Run `cd docusaurus && npm run prebuild:docs` to regenerate `_generated/cn-detail-page.md` etc.; commit the diff.

## 8. Tests

- [ ] 8.1 `tests/components/CnPageRenderer.spec.js` — three new cases per task 1.2.
- [ ] 8.2 `tests/components/CnDetailPage.spec.js` — new cases:
  - schema-driven prop set fuses to `resolvedObjectType`
  - mount triggers `registerObjectType` + `fetchObject` with the four-arg signature
  - `objectId` change re-fetches
  - fetch error sets `error` state
  - empty slot + loaded object → auto-body renders both widgets
  - slot content → auto-body suppressed
  - `sidebarTabs` propagates into `objectSidebarState.tabs`
  - `beforeDestroy` resets `objectSidebarState.active = false`
- [ ] 8.3 `tests/components/CnAppRoot.spec.js` — new cases:
  - `objectSidebarState.active = true` + no `#sidebar` slot → auto-mount renders
  - `#sidebar` slot present → auto-mount suppressed
  - `objectSidebarState.active = false` → no auto-mount

## 9. Manual browser verification (openbuilt)

- [ ] 9.1 In the openbuilt working tree: `npm i ../nextcloud-vue` (or bump the package version + reinstall) → `npx webpack`.
- [ ] 9.2 Deploy: `docker cp js/openbuilt-main.js nextcloud:/var/www/html/custom_apps/openbuilt/js/openbuilt-mainv$(date +%s).js`, bump the `Util::addScript` template name, `apache2ctl graceful`.
- [ ] 9.3 Navigate to `/index.php/apps/openbuilt/applications`, click the Hello World card, verify: header shows "Virtual app" title from manifest; body shows data widget (manifest JSON) + metadata widget (id, register, schema, created, updated, owner); right sidebar shows Overview / Manifest / Version history / Diff / Audit tabs.
- [ ] 9.4 Screenshot the working detail page and attach to the PR description.

## 10. PR

- [ ] 10.1 Branch off `beta` (per nextcloud-vue branching policy), commit with a single message starting `feat(detail): schema-driven CnDetailPage from manifest`.
- [ ] 10.2 Open PR to ConductionNL/nextcloud-vue against `beta`. Body links: this openspec change, ADR-017, ADR-022, ADR-024.
- [ ] 10.3 Self-review-approve and merge (per the user's standing nc-vue authorisation). Tag the new beta release.
