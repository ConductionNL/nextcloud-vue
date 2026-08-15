# Manifest named-view sidebar

## Why

Hydra ADR-024 ("App manifest fleet-wide adoption") drives every
Conduction app to express its shell — routes, navigation, page
types, sidebars — declaratively in `src/manifest.json`. The lib v2
backlog row **"Named-view sidebar (router-named-view pattern) —
opencatalogi Search"** flags one corner of that surface that the
current renderer cannot yet model: a **per-route sidebar component**
distinct from the host App's default sidebar.

Vue Router's named-view pattern lets a route declare multiple
co-mounted components — typically a `default` page and a `sidebar`
named view — and the host renders them via sibling `<router-view>`
and `<router-view name="sidebar">` elements. Opencatalogi's `Search`
route is the canonical example: every other route renders the
shared `CnIndexSidebar` / `CnObjectSidebar` siblings the host wires
once at App.vue level, but `Search` swaps in a bespoke
`SearchSideBar` for that route only.

The current manifest cannot express this. `pages[].sidebar.show`
(from `manifest-detail-sidebar-config`) gates the host App's
sidebar slot on/off per page, but there's no way to swap the slot
**content** to a different component for a single page. Apps that
need this — opencatalogi today, and any future app introducing a
domain-specific sidebar (chat reading pane, map filter panel,
file-tree, etc.) — fall back to bespoke `<router-view name="...">`
wiring outside the manifest.

That defeats the declarative promise of the manifest for the same
reason `manifest-abstract-sidebar` did before it: the part of the
shell users spend the most time interacting with is the part that
keeps falling out of the manifest.

## What Changes

One additive field on `pages[]`, two additive provide channels, no
new components:

- **Schema:** `pages[]` gains an optional `sidebarComponent: string`
  — a registry name resolved against the consuming app's
  `customComponents` registry. When set, the host's `#sidebar` slot
  hosts the registry-resolved component **for that page only**;
  every other page renders the host's default sidebar contents
  (`CnIndexSidebar` / `CnObjectSidebar` / whatever the consumer
  wired into the slot).

- **`CnPageRenderer`** publishes a new reactive provide channel
  `cnPageSidebarComponent` (sibling of the existing
  `cnPageSidebarVisible`). Holder shape `{ value: Component | null }`
  — `null` when the current page has no `sidebarComponent`,
  otherwise the registry-resolved Vue component for that page.

- **`CnAppRoot`** injects `cnPageSidebarComponent`. When the holder
  carries a non-null component, `CnAppRoot` mounts that component
  inside `<slot name="sidebar">` **before** falling back to the
  consumer-provided slot content. Apps that don't use the manifest
  feature pass through unchanged — the slot fallback fires when the
  holder is `null` or the inject is absent.

- **Validator:** `validateManifest()` enforces
  `pages[].sidebarComponent` is a non-empty string when present.
  Schema description on `pages[].sidebarComponent` documents
  registry resolution and the precedence with `sidebar.show`.

- **Tests + docs:** `tests/components/CnPageRendererNamedViewSidebar.spec.js`
  (new), update `cn-page-renderer.md`, `cn-app-root.md`,
  `migrating-to-manifest.md`, `validateManifest.spec.js`.

## Problem

Three concrete pain points justify the surgical addition:

1. **Opencatalogi adoption is blocked at `Search`.** Every other
   route in opencatalogi's manifest can use the standard host
   sidebars; Search has to keep the bespoke `<router-view
   name="sidebar">` mount in `App.vue` *and* the manifest entry in
   `manifest.json`, plus the manual import. The split between the
   two sources of truth is exactly the duplication ADR-024 is
   trying to eliminate.

2. **Future apps inherit the same workaround.** Any app introducing
   a route-specific sidebar (a search filter pane, a chat reading
   pane, a map's layer panel) hits the same gap and ends up
   wiring named-views by hand. Without this change, the manifest
   stays a half-declarative shell for that subset of apps.

3. **The neighbouring abstractions all already exist.** The
   `customComponents` registry already resolves
   `page.headerComponent`, `page.actionsComponent`,
   `page.cardComponent`, `page.component`, `page.slots`,
   `pages[].config.sidebarProps.tabs[].component`. Adding
   `sidebarComponent` is a one-line addition to the same registry
   resolution path — no new infrastructure required.

## Proposed Solution

### Schema

```jsonc
{
  "id": "search",
  "type": "custom",
  "title": "menu.search",
  "component": "SearchPage",
  "sidebarComponent": "SearchSideBar"
}
```

Resolution rules:

- `sidebarComponent` resolves against the same `customComponents`
  registry that powers `headerComponent`, `actionsComponent`, and
  the rest. Unknown names log a `console.warn` and fall through
  (the consumer's default `#sidebar` slot content renders).
- `sidebarComponent` and `sidebar.show` compose: when `show: false`
  the slot does not render at all, so a `sidebarComponent` set
  alongside `show: false` is suppressed by the visibility gate.
  Documented as the deterministic precedence; the validator emits
  a `console.warn` when both are set together so manifest authors
  notice the dead config.

### Renderer

`CnPageRenderer` already provides `cnPageSidebarVisible`. The
change adds a parallel provide:

```js
provide() {
  return {
    cnPageSidebarVisible: this.pageSidebarVisible,
    cnPageSidebarComponent: this.pageSidebarComponent,
  }
}
```

The new holder is populated in the same watcher pattern: when the
current page has a `sidebarComponent` field that resolves against
`effectiveCustomComponents`, push the resolved component into
`pageSidebarComponent.value`; otherwise push `null`. The reactive
holder shape mirrors the visibility holder so consumers see a
familiar interface.

### Host shell

`CnAppRoot` injects both holders:

```vue
<slot v-if="cnPageSidebarVisible.value !== false" name="sidebar">
  <component
    :is="cnPageSidebarComponent.value"
    v-if="cnPageSidebarComponent.value" />
</slot>
```

The order matters: `cnPageSidebarVisible` gates first (a `false`
visibility wins over any sidebarComponent — consistent with the
existing precedence rule). When visible AND a component is
resolved, the resolved component renders inside the slot's
**default content**. The consumer's `#sidebar` slot override still
wins over the default — apps that already wire a sibling
`CnObjectSidebar` keep working unchanged.

## Out of scope

- Slot-name aliasing. The host's `#sidebar` slot is the single
  named slot the manifest can drive; alternative slot names
  (`#secondary`, `#right-panel`) are not part of this change. If a
  future app needs a different slot, it can register a custom page
  type that renders its own slots.

- Per-page tab content for the existing built-in `CnObjectSidebar`.
  That's the territory of `manifest-abstract-sidebar` and
  `manifest-detail-sidebar-config`; this change is strictly for the
  full-sidebar swap case where a route wants a completely different
  sidebar component (not a tab config).

- Vue Router named-view bindings in the consumer app's router
  config. Apps still write their own router; this change is purely
  about expressing the per-page sidebar component declaratively in
  the manifest so the renderer can host it via the standard
  `#sidebar` slot pathway. Consumers MAY still use named-views
  directly if they prefer — the two patterns coexist.

- Lazy loading of the resolved component. The `customComponents`
  registry is the consumer's responsibility; the consumer can
  `defineAsyncComponent` the entry the same way pageTypes already
  does.

## See also

- `nextcloud-vue/openspec/changes/add-json-manifest-renderer/specs/json-manifest-renderer/spec.md` — parent contract; `pages[]` shape and registry resolution are defined there.
- `nextcloud-vue/openspec/changes/manifest-detail-sidebar-config/` — established the `cnPageSidebarVisible` provide channel; this change parallels it with `cnPageSidebarComponent`.
- `nextcloud-vue/openspec/changes/manifest-abstract-sidebar/` — opened the `CnObjectSidebar.tabs` enum; complementary to this change but doesn't model the full-sidebar-swap case.
- Hydra ADR-024 (App manifest, fleet-wide adoption) — the convention this change serves; lib v2 backlog row "Named-view sidebar (router-named-view pattern) — opencatalogi Search".
- `opencatalogi/src/router/index.js` — the canonical use case (`SearchSideBar` as a named-view component).
