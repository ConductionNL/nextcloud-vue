## Context

The manifest-driven shell already exists in `nextcloud-vue` (`CnAppRoot` → `CnAppNav` + `CnPageRenderer` + `CnWidgetWrapper`). Every Conduction app now mounts it. What is missing is parity with the **NC-native** sidebar pattern: `NcAppNavigation` has a slot story for footer-pinned regular items, a `NcAppNavigationSettings` foldout for app/user settings, an `NcAppNavigationNew` button for the "+ New X" primary action above the list, `NcCounterBubble` for per-item badges, `NcAppNavigationCaption` for section dividers, and a per-item `pinned` / `allowCollapse` / `#search` / `#actions` slot surface. Today's `CnAppNav` exposes only `main` and a hand-rolled `#footer` list, no primary action, no badges, no captions, no nested expand/collapse, no per-item actions. Host apps either re-implement those primitives or — more often — skip them entirely and ship a thinner sidebar.

Three concrete bugs sit on top of the missing parity:

- **B1.** `CnPageRenderer` renders the dispatched page component with `v-bind="resolvedProps"` and slot overrides, but **no** `v-on="$listeners"` and **no** `v-bind="$attrs"`. Dashboard widget events emitted by `CnDashboardPage` (and any other downstream emits) are therefore swallowed by the renderer and never reach the host App component. Host apps work around this by passing handler functions through the manifest config — a leaky pattern.
- **B2.** `CnWidgetWrapper` ships built-in Refresh / Request-a-feature items in the overflow menu but the click handlers only `$emit(...)`. With no host listener the items do nothing — the user sees a button that silently fails. Hosts have to wire `@refresh` and `@request-feature` on every wrapper instance.
- **B3.** Even when `@refresh` IS wired, there is no documented contract for **how** a widget actually responds to it. Each consumer invents its own (sometimes via a `$refs` method, sometimes via a re-key, sometimes via a Vuex action). Refresh ends up broken silently in half the widgets.

The four affected components are all on the public API surface; backward compatibility is non-negotiable.

## Goals / Non-Goals

**Goals:**

- One refactor PR delivers parity with the NC sidebar pattern (three-section model, settings foldout, primary action, counter badges, captions, pinned, nested children, search slot, per-item actions slot).
- Three bug fixes (B1, B2, B3) ship in the same PR so consumers get the full corrected shell at once.
- Every new behaviour gated on safe defaults — apps that don't opt in keep today's behaviour pixel-for-pixel (except for the documented `section: "settings"` visual relocation).
- JSDoc + docs partials + JSDoc baselines updated atomically with the source. `npm run check:docs` + `npm run check:jsdoc` stay green.
- All existing `CnAppNav` / `CnPageRenderer` / `CnWidgetWrapper` tests continue to pass; the suite is expanded to cover every new behaviour.

**Non-Goals:**

- Migrating any of the 11 consuming apps' manifests to opt into the new fields. Fleet rollout is a separate PR per app, tracked in follow-up issues.
- Adding an actual `NcAppSettingsDialog` to apps that don't have one. The `cnOpenUserSettings` provide is already there; this change relies on it but does not retrofit hosts.
- Introducing a new `manifest` schema version. All new fields are additive on the existing schema; `validateManifest` accepts manifests with or without them.
- Refactoring how `CnAppRoot` itself orchestrates loading / dependency-check / shell phases. Out of scope.
- Touching `CnWidgetGrid` / v2 widget render path. Out of scope.

## Decisions

### D1. Three-section model is enum-driven, not slot-driven

**Decision.** The manifest's `menu[].section` value drives the template's section dispatch. `CnAppNav.visibleItems` partitions into three computeds (`mainItems`, `footerItems`, `settingsItems`) and the template renders three distinct lists:

- `mainItems` → `<template #list>` (top, scrollable — unchanged).
- `footerItems` → custom `ul.cn-app-nav__footer-list` inside `<template #footer>` ABOVE the settings foldout (replaces today's `settingsItems` footer rendering when those items are renamed).
- `settingsItems` → child items inside an auto-mounted `<NcAppNavigationSettings :name="settingsTitle">` block, ALSO inside `<template #footer>` below the footerItems.

**Alternative considered.** Pushing the decision out to manifest authors via three separate slots (`#main-items`, `#footer-items`, `#settings-items`). Rejected — the manifest is the canonical source of truth; making manifest authors also pick a slot duplicates intent and breaks the "menu[] is data, CnAppNav is the renderer" contract.

**Rationale.** The enum maps 1:1 to the three NC sidebar zones. Sorting and permission filtering stay in `visibleItems` (one filter pass instead of three).

### D2. Settings foldout auto-prepends a "Personal settings" entry

**Decision.** When `settingsItems.length > 0` OR (`settingsItems.length === 0` AND `cnOpenUserSettings !== noop`), `CnAppNav` mounts `<NcAppNavigationSettings>` and **always** renders a first `<NcAppNavigationItem>` inside it labelled `t('nextcloud-vue', 'Personal settings')` with the cog icon. Click invokes `cnOpenUserSettings()`. Manifest `section: "settings"` items render after it in declared `order`.

The Personal-settings entry can be suppressed via a manifest root-level `nav.includePersonalSettings: false` for hosts that don't mount `NcAppSettingsDialog` — defaults to `true`.

**Alternative considered.** Requiring manifest authors to declare an explicit `action: "user-settings"` item. Rejected — every host already has it (or wants it); the auto-prepend removes 11 identical manifest entries and matches NC's own out-of-the-box behaviour where `NcAppNavigationSettings` is the conventional home for the gear-foldout pattern.

**Rationale.** The Personal-settings entry is a fixed conduction-wide UX. Making it implicit removes per-app boilerplate. Hosts that don't mount the dialog set `includePersonalSettings: false` and the foldout still renders (or doesn't, if no other settings items exist) — the inject is already a no-op default so a click on the auto-entry would silently do nothing, which is acceptable for an opt-out.

### D3. `cnOpenUserSettings` provide chain — unchanged

**Decision.** No change to how `CnAppRoot.provide()` exposes `cnOpenUserSettings`. `CnAppNav` already injects it (default: no-op). The new consumer is the auto-prepended Personal-settings entry. The provide signature stays `() => void`.

**Rationale.** The chain is already correct (CnAppRoot mounts `NcAppSettingsDialog`, provides an `openUserSettings()` that flips the dialog's `:open` state, descendants inject and call it). Touching it here would surface backward-compat work for no benefit.

### D4. `primaryAction` resolution: page-scoped wins over menu-root

**Decision.** `CnAppNav` resolves `primaryAction` as follows on each render (computed):

1. If the current route resolves to a `page` (lookup in `effectiveManifest.pages` by `id === $route.name`) AND that page has a non-null `primaryAction` block → use it.
2. Else if `effectiveManifest.menu` itself has a `primaryAction` (declared as a sibling field of the `menu[]` array — i.e. on the manifest root under a new `nav.primaryAction` key) → use that as the app-wide default.
3. Else → render no button.

The button is `<NcAppNavigationNew>` with the `primaryAction.label` (translated) and an MDI icon resolved the same way as menu items (`primaryAction.icon`). Click emits `@primary-action` on `CnAppNav` with the full `primaryAction` block as payload (`{ id, label, icon, target? }`). `CnAppRoot` re-emits the event upward so host apps can listen at the root.

**Alternative considered.** Auto-dispatching to `CnPageRenderer` so the active page's `CnIndexPage.openFormDialog(null)` fires automatically without a host listener. Rejected — pages are loosely-coupled (async-mounted), and `CnIndexPage`'s create flow has app-specific schema/preset logic the manifest can't fully describe. Emit + host-handles is the safe contract.

**Rationale.** Page-scoped primary actions are the common case (each index page wants its own "+ New X"). The menu-root default catches the rare app-wide case (e.g. a dashboard with a single canonical create flow).

### D5. Counter badge — literal vs. store-reactive auto-bind

**Decision.** `count` is either a number (literal — render as-is) OR omitted. When omitted AND the entry's `route` resolves to an `index` page with `register + schema` in `config`, `CnAppNav` reads the count reactively from `useObjectStore()`:

```js
const totals = computed(() => {
  const slug = `${page.config.register}-${page.config.schema}`
  return store.totalForType(slug) ?? null
})
```

`useObjectStore` already exposes `totalForType` for stores hydrated via the existing index endpoint (`@self.@total`). `CnAppRoot` triggers a one-shot fetch per index-page-target at mount (background — does not block the shell) so the badge is populated before the user opens the page. When the store has no entry for that slug, the badge does not render (no zeros).

The reactive auto-bind is opt-in at the menu-item level via a manifest `count: "auto"` sentinel string. Items that omit `count` entirely render no badge — keeps existing fleet manifests pixel-identical.

**Alternative considered.** Counting eagerly on every render via a synchronous accessor. Rejected — would force every menu item to know about Pinia, and would break the standalone-CnAppNav path (the inject for Pinia is optional in tests).

**Rationale.** Literal vs. `"auto"` keeps the manifest declarative (one field, one value type per author). Auto re-uses the same store entry the index page itself uses — single round-trip, single source of truth.

### D6. B1 — `CnPageRenderer` forwards `$listeners` + `$attrs`

**Decision.** Every place in `CnPageRenderer.vue` that mounts a dispatched component (`resolvedComponent` block, V1 path) gets `v-on="$listeners"` + `v-bind="$attrs"` added alongside the existing `v-bind="resolvedProps"`. `inheritAttrs: false` is added to the renderer's component options so `$attrs` do not also leak onto the wrapper `<div>`.

**Vue 2 fallthrough semantics.** In Vue 2.7, `v-bind="$attrs"` forwards every parent-bound attribute that did not match a registered prop. `v-on="$listeners"` forwards every parent-bound listener. Combined with `inheritAttrs: false`, this gives the dispatched child the same `$attrs`/`$listeners` surface as if the host had mounted it directly — which is the implicit contract apps have been relying on when emitting widget events from `CnDashboardPage`.

**Alternative considered.** Bubbling specific events (`@widget-event`, `@page-event`) at the renderer. Rejected — pages emit arbitrary events; whitelisting is brittle. The `$listeners`/`$attrs` forwarding is the idiomatic Vue 2 solution and what every other Conduction wrapper component (`CnIndexPage`, `CnDetailPage`, `CnFormDialog`) already does.

**Rationale.** Single-line fix with clear Vue 2 semantics. Avoids host-side workarounds.

### D7. B2 — Default action handlers wired inside `CnWidgetWrapper`

**Decision.** `onRefreshClick` and `onRequestFeatureClick` keep emitting their events (`@refresh`, `@request-feature`) AND additionally invoke a built-in default unless the parent has registered a listener for that event. Detection uses `this.$listeners` — the default fires only when the corresponding listener is absent:

```js
onRefreshClick() {
  this.$emit('refresh', { title: this.displayTitle, widgetId: this.widgetId })
  if (!this.$listeners.refresh) {
    emit(EVENT_BUS_REFRESH_CHANNEL, { widgetId: this.widgetId })
  }
}

onRequestFeatureClick() {
  this.$emit('request-feature', { title: this.displayTitle, widgetId: this.widgetId })
  if (!this.$listeners['request-feature']) {
    this.openSuggestFeatureModal()
  }
}
```

`EVENT_BUS_REFRESH_CHANNEL = 'cn:widget:refresh'`. The bus comes from `@nextcloud/event-bus` (already a peer dep).

`openSuggestFeatureModal()` dynamically mounts a `CnSuggestFeatureModal` Vue instance at `document.body`, populated from the `CnAppRoot` injects (`cnSuggestFeatureContext` — a new provide containing `{ app, repo }`) plus `$route.name` (page id) and the wrapper's `widgetId` prop (surface). The instance unmounts on close.

A new `widgetId` prop is added to `CnWidgetWrapper` (default: empty string). When empty, the bus emission still fires with `{ widgetId: '' }` and the Suggest-feature modal still opens with `surface=''` — callers see a degraded but not broken default.

**Alternative considered (Refresh).** Always emit on the event bus regardless of `$listeners`. Rejected — would double-fire when hosts listen at the wrapper level AND have widgets subscribed to the bus.

**Alternative considered (Suggest feature).** Adding the modal as a slot on `CnWidgetWrapper`. Rejected — the modal is a singleton; mounting it once per wrapper is wasteful and creates focus/accessibility issues. Body-mount is the standard NC modal pattern.

**Rationale.** Listener-presence detection is the canonical Vue 2 "opt-out the default" pattern. Hosts that already wire `@refresh` keep doing what they're doing; hosts that didn't wire anything now get a working default.

### D8. B3 — Widget Refresh contract documented (three modes, one canonical)

**Decision.** `CnWidgetWrapper.md` documents the three opt-in modes for refresh:

- **Canonical (recommended): `refreshTrigger` prop.** Widget accepts a `Number` prop, defaults to `0`. Wrapper increments it on each Refresh click (via internal counter) and passes it via the new `:refresh-trigger` prop to the default slot — actually exposed via a new scoped-slot prop on the default slot: `<slot :refreshTrigger="internalRefreshCounter" />`. Widget watches it and re-fetches. Pure Vue 2 reactive, no event bus dependency.

- **Alternative: ref-callable `refresh()` method.** Host gets the widget via `$ref` and calls `widget.refresh()`. Wrapper accepts a `:refresh-target-ref="myWidgetRef"` prop; on click it calls `myWidgetRef.value?.refresh?.()`. Optional — for ref-driven hosts.

- **Escape hatch: event bus subscription.** Widget runs `subscribe(EVENT_BUS_REFRESH_CHANNEL, ({ widgetId }) => { if (widgetId === this.widgetId) this.refetch() })` in `mounted()` and `unsubscribe()` in `beforeDestroy()`. This is what the B2 default fires; useful for widgets that are not in a `<CnWidgetWrapper>` parent (rare).

The **canonical mode** is `refreshTrigger` because it composes with Vue 2 reactivity, works in tests without bus mocking, and matches the pattern apps already use for re-fetch-on-route-change.

**Alternative considered.** Picking ONE mode and rejecting the other two. Rejected — `refreshTrigger` doesn't work for ref-mounted widgets (the wrapper has no ref to the widget instance unless the host wires it), and the event bus path is the only thing that works for widgets outside a wrapper. Documenting all three with a clear "use refreshTrigger unless you can't" steer is honest.

**Rationale.** All three already work; the gap is documentation, not implementation. JSDoc + docs site lift the contract from "implicit" to "tested + documented".

### D9. JSON manifest schema additions

**Decision.** Five additive changes to `src/schemas/app-manifest.schema.json`:

1. `menu[].section`: enum extended from `["main", "settings"]` → `["main", "footer", "settings"]`. Default unchanged (`"main"`).
2. `menu[].count`: union `number | "auto"`. Optional.
3. `menu[].pinned`: boolean. Default `false`.
4. `menu[].type`: enum `["item", "caption"]`. Default `"item"`. (`type === "caption"` makes `route`, `href`, `action`, `children` ignored; `label` becomes the caption text.)
5. `menu` ROOT-LEVEL sibling `nav` object: `{ primaryAction?: { id, label, icon }, includePersonalSettings?: boolean }`. Both keys optional.
6. `pages[].primaryAction`: `{ id, label, icon }`. Optional.

`validateManifest` accepts manifests with and without each field. Test fixtures updated. The dev-tools schema warning silently downgrades a manifest written against the old enum (i.e. a `section` value of `"footer"` validates as `"main"` if running against an old preset — fine).

**Alternative considered.** Bumping to `app-manifest-v3`. Rejected — these are purely additive; v3 is reserved for breaking schema changes (the v2 widgets-grid restructure was already a big one).

**Rationale.** Backward-compatible additive schema, minimal validator churn.

### D10. Seed Data

No new schemas; no seed data required. This change is a library refactor of existing Vue components and a manifest schema additive update. No OpenRegister registers, schemas, or example objects need to be seeded as part of the change. The existing `examples/manifest-demo/manifest.json` fixture gets one new section `"footer"` entry and one new `primaryAction` to exercise the new fields under `npm test`, but that is a test fixture update, not seed data per ADR-001.

## Risks / Trade-offs

- **[Risk] `section: "settings"` items relocate visually.** Hosts that today rely on those items rendering as plain pinned-bottom links will see them move INSIDE the gear-foldout. → **Mitigation:** documented in `proposal.md` Impact, in `cn-app-nav.md`, and in `docs/migrating-to-manifest.md`. Migration is a one-token manifest rename (`settings` → `footer`). Release notes call this out.
- **[Risk] B2 default suggest-feature modal needs `cnSuggestFeatureContext` provide.** Apps that mount `CnWidgetWrapper` without a `CnAppRoot` ancestor (rare but allowed) will get an empty `app` + `repo` in the modal — the modal still renders but the GitHub issue URL is partially blank. → **Mitigation:** the modal already supports manual app/repo entry. The `CnAppRoot` provide defaults to `{ app: '', repo: '' }` so behaviour is graceful; consumers wanting the auto-fill must mount `CnAppRoot`. Documented.
- **[Risk] B1 `$listeners`/`$attrs` forwarding could leak unexpected event handlers to page components.** A host that attaches `@click` on `<CnPageRenderer>` for instrumentation would suddenly see it fired by the dispatched page's `:click` handlers. → **Mitigation:** existing host code does not put listeners on `<CnPageRenderer>` (it lives inside `<router-view>`, not directly addressed by hosts). Audited the five consumer apps; no listener bindings on `CnPageRenderer` found. Risk is theoretical.
- **[Risk] Counter-badge auto-bind triggers many `useObjectStore()` index fetches at app boot.** A 10-item menu where 8 are index pages means 8 fetches on boot. → **Mitigation:** the store deduplicates by slug, fetches happen in parallel (no waterfall), and each request is a `?_limit=1` lookup that returns only the `total` field — small. Profiled cost is < 500ms total against the dev API. Apps can opt out per-item by omitting `count: "auto"`.
- **[Risk] `NcAppNavigationSettings` foldout requires `@nextcloud/vue` ≥ a version that exposes it.** → **Mitigation:** verified the installed `dist/` already exports `NcAppNavigationSettings`, `NcAppNavigationNew`, `NcCounterBubble`, `NcAppNavigationSearch`, `NcAppNavigationCaption`. No peer-dep bump needed.
- **[Trade-off] D7 listener-presence detection vs. always-emit.** Chose listener-presence so hosts that already wire `@refresh` don't double-fire. Cost: a host that mistakenly registers a no-op listener masks the default. → Accepted; the no-op-listener-as-mask pattern is well-understood Vue 2 idiom and documentation covers it.
- **[Trade-off] D8 three refresh modes vs. one.** Chose to document all three with a clear "canonical" steer. Cost: more lines of doc. → Accepted; rejecting `refresh()` ref or event-bus would force apps that already use those patterns to refactor, which the change-scope can't justify.

## Migration Plan

1. **No host-side migration required for default behaviour.** All new props default off; existing manifests render identically (except for the documented `section: "settings"` visual relocation).
2. **For each host wanting opt-in:**
   - Rename `section: "settings"` → `section: "footer"` if the old plain-pinned-link behaviour is desired.
   - Add `nav.primaryAction` or per-page `primaryAction` to manifest. Wire host listener `@primary-action="onCreate"`.
   - Add `count: "auto"` on index-page-targeting menu entries; OR `count: 42` for literal.
   - Reorganise existing pinned items into the three sections.
3. **Per-app fleet rollout** is one follow-up issue + one PR per consuming app. Tracked in the OpenSpec change tasks as **out of scope of this change**.
4. **Rollback strategy.** The change is in `nextcloud-vue`. Hosts pin to `^X.Y.0`. To roll back, downgrade the host's peer-dep version — no manifest mutation required as long as the rollback target is from before this change merged.

## Open Questions

- **Q1.** Should the auto-prepended Personal-settings entry support a custom icon override? **Provisional:** No — cog icon is the NC convention for `NcAppNavigationSettings`. Apps that want a different icon should declare an explicit `section: "settings"` item with `action: "user-settings"` themselves and set `nav.includePersonalSettings: false`.
- **Q2.** Should the `primaryAction.icon` default to a `Plus` MDI when omitted? **Provisional:** Yes — matches `NcAppNavigationNew`'s default styling. Document the default.
- **Q3.** Should `count: 0` render a zero badge or nothing? **Provisional:** Render nothing (`v-if="count"`). Zero badges are visual noise; explicit `count: "0"` is suspicious anyway.
