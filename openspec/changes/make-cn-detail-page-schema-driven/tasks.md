## 1. CnPageRenderer — forward top-level title, description, icon

- [x] 1.1 In `src/components/CnPageRenderer/CnPageRenderer.vue`, update `resolvedProps()` to spread `{ title: currentPage.title, description: currentPage.description, icon: currentPage.icon }` *before* `...page.config` and `...$route.params` (so config still overrides top-level fields and route params still override config). Keep existing JSDoc comment in sync with the new precedence order.
- [x] 1.2 Extend the existing test in `tests/components/CnPageRenderer.spec.js` (or add a new spec) with three cases: (a) manifest with only top-level `title` → child receives it; (b) manifest with both top-level and `config.title` → config wins; (c) manifest with top-level + config + matching `$route.params` key → params win.
- [x] 1.3 Update `docs/components/cn-page-renderer.md` to document the new forwarded keys and the precedence order.

## 2. CnDetailPage — register, schema, sidebarTabs props + resolvedObjectType

- [x] 2.1 In `src/components/CnDetailPage/CnDetailPage.vue`, add three props: `register: { type: String, default: '' }`, `schema: { type: String, default: '' }`, `sidebarTabs: { type: Array, default: () => [] }`. JSDoc each one.
- [x] 2.2 Add a `resolvedObjectType` computed: `this.objectType || (this.register && this.schema ? \`${this.register}-${this.schema}\` : '')`. Replace `this.objectType` with `this.resolvedObjectType` in every internal reference (setup() block, syncSidebarState(), lock + subscription wiring). Keep the `objectType` prop intact for backwards-compat.
- [x] 2.3 Verify `setup()` still receives the right value by reading `props.objectType || (props.register && props.schema ? \`${props.register}-${props.schema}\` : '')` for the subscription/lock arguments.

## 3. CnDetailPage — schema-driven fetch via useObjectStore

- [x] 3.1 Add a `hasSchemaDrivenFetch` computed: returns `true` iff `this.register && this.schema && this.objectId` are all non-empty.
- [x] 3.2 Add an `effectiveObjectStore` computed mirroring `CnLogsPage.objectStore`: `this.objectStore || useObjectStore()`.
- [x] 3.3 Add a `fetchObjectIfNeeded()` method that: returns early if `!hasSchemaDrivenFetch`; sets `loading: true`, clears `error`; calls `effectiveObjectStore.registerObjectType(...)`; awaits `effectiveObjectStore.fetchObject(...)`; catches errors into `this.error`; clears `loading` in finally.
- [x] 3.4 Call `fetchObjectIfNeeded()` from `mounted()` and from new watchers on `register`, `schema`, `objectId`.
- [x] 3.5 Add a `currentObject` computed: `effectiveObjectStore?.objects?.[resolvedObjectType]?.[objectId] ?? null`.

## 4. CnDetailPage — auto-body with data + metadata widgets

- [x] 4.1 Add a `hasDefaultSlotContent` computed for empty/whitespace-only slot detection.
- [x] 4.2 Add a `shouldRenderAutoBody` computed: `hasSchemaDrivenFetch && currentObject && !hasDefaultSlotContent && !hasGridLayout`.
- [x] 4.3 In the `.cn-detail-page__content` block of the template, render `<div v-if="shouldRenderAutoBody" class="cn-detail-page__auto-body"><CnObjectDataWidget ... /><CnObjectMetadataWidget ... /></div>` *before* the existing `<slot />`. The `v-else` on the slot keeps existing consumers untouched.
- [x] 4.4 Import + register `CnObjectDataWidget` and `CnObjectMetadataWidget` in the component's `components: { ... }` map.
- [x] 4.5 CSS — `.cn-detail-page__auto-body { display: flex; flex-direction: column; gap: 16px; }` scoped to the component.

## 5. CnDetailPage — sidebarTabs into objectSidebarState

- [x] 5.1 Extend `syncSidebarState()` to write the additional `tabs`, `register`, `schema` fields. Existing fields untouched.
- [x] 5.2 Add a watcher on `sidebarTabs` calling `syncSidebarState()`. Existing watchers stay.
- [x] 5.3 Update the `beforeDestroy()` hook to reset `objectSidebarState.tabs = undefined` alongside the existing `active = false` reset.

## 6. CnAppRoot — auto-mount CnObjectSidebar at NcContent level

- [x] 6.1 Import `CnObjectSidebar` at the top of `src/components/CnAppRoot/CnAppRoot.vue` and register it in `components: { ... }`.
- [x] 6.2 Inject ancestor `objectSidebarState` (under alias `ancestorObjectSidebarState`) with a `null` default; supply a reactive local holder `localObjectSidebarState` (`Vue.observable({...})`) on `data()` so descendants writing via inject trigger re-renders.
- [x] 6.3 Below the existing `cnIndexSidebarConfig` hoist block, add the auto-mount block:
  ```vue
  <CnObjectSidebar
      v-if="shouldAutoMountObjectSidebar"
      :tabs="effectiveObjectSidebarState.tabs"
      :object-type="effectiveObjectSidebarState.objectType"
      :object-id="effectiveObjectSidebarState.objectId"
      :register="effectiveObjectSidebarState.register"
      :schema="effectiveObjectSidebarState.schema"
      :title="effectiveObjectSidebarState.title"
      :subtitle="effectiveObjectSidebarState.subtitle"
      :hidden-tabs="effectiveObjectSidebarState.hiddenTabs" />
  ```
  The `shouldAutoMountObjectSidebar` computed gates on:
  no `#sidebar` slot from consumer, no `ancestorObjectSidebarState`,
  `localObjectSidebarState.active === true`, AND both `objectType`
  and `objectId` non-empty (defense-in-depth against CnIndexPage's
  `inject('sidebarState') ?? inject('objectSidebarState')` fallback
  leaking an `active: true` into the wrong channel — the openbuilt
  double-sidebar regression).
- [x] 6.4 Provide `objectSidebarState` (detail-page channel) AND a
  separate `sidebarState` (index-page channel) so the two reactive
  holders stay isolated.
- [x] 6.5 Slot precedence + ancestor-state precedence documented in
  the SFC comment block.

## 7. Documentation

- [x] 7.1 Update `docs/components/cn-detail-page.md` with the new props (`register`, `schema`, `sidebarTabs`), schema-driven mode summary, auto-body behaviour, sidebar precedence note + manifest example.
- [x] 7.2 Update `docs/components/cn-app-root.md` with the new auto-mount block and the `#sidebar` precedence rule (this batch).
- [~] 7.3 `npm run check:docs` and `npm run check:jsdoc` — not re-driven from this batch; the touched files carry JSDoc per task 2.1.
- [~] 7.4 `cd docusaurus && npm run prebuild:docs` — not re-driven from this batch; docusaurus partials regenerate on push via the prebuild hook.

## 8. Tests

- [x] 8.1 `tests/components/CnPageRenderer.spec.js` — covers top-level title forwarding + config-override + route-params override.
- [x] 8.2 `tests/components/CnDetailPageSchemaDriven.spec.js` — covers:
  - schema-driven prop set fuses to `resolvedObjectType`
  - mount triggers `registerObjectType` + `fetchObject`
  - `objectId` change re-fetches
  - fetch error sets `error` state
  - empty slot + loaded object → auto-body renders both widgets
  - slot content → auto-body suppressed
  - `sidebarTabs` propagates into `objectSidebarState.tabs`
  - `beforeDestroy` resets `objectSidebarState.active = false`
  
  Note: `CnDetailPageSidebarTabs.spec.js` also exercises the
  sidebarTabs → objectSidebarState propagation.
- [x] 8.3 `tests/components/CnAppRootObjectSidebar.spec.js` — covers:
  - `objectSidebarState.active = true` + objectType/objectId set → auto-mount renders
  - `#sidebar` slot present → auto-mount suppressed
  - `objectSidebarState.active = false` → no auto-mount
  - active but no objectType/objectId → no auto-mount (regression guard)
  - ancestor provides `objectSidebarState` → auto-mount defers
  - `sidebarState` provide is distinct from `objectSidebarState`.

## 9. Manual browser verification (openbuilt)

- [~] 9.1 In the openbuilt working tree: `npm i ../nextcloud-vue` (or bump the package version + reinstall) → `npx webpack`. Not driven from this spec batch; openbuilt consumes a published version of the lib.
- [~] 9.2 Deploy: `docker cp js/openbuilt-main.js ...`. Deferred to the openbuilt release loop.
- [~] 9.3 Navigate to `/index.php/apps/openbuilt/applications`, click the Hello World card, verify auto-body + sidebar tabs. Deferred to the openbuilt release loop.
- [~] 9.4 Screenshot the working detail page and attach to the PR description. Deferred to the openbuilt release loop.

## 10. PR

- [~] 10.1 Branch off `beta` — this batch ships on
  `feature/nv-big/three-big` from `origin/development` per the
  worktree configuration.
- [~] 10.2 Open PR to ConductionNL/nextcloud-vue against `beta` —
  superseded by the Codeberg `Conduction/nextcloud-vue` migration.
- [~] 10.3 Self-review-approve and merge — handled by the nv-big
  parent driver (`--no-ff` merge to `development` + push to
  Codeberg origin).
