# Design: Manifest abstract sidebar

## Reuse analysis

- `CnIndexSidebar` already has the full search / columns / facets /
  metadata surface needed for an index sidebar. It's just unreachable
  from the manifest today. `CnIndexPage`'s job becomes "instantiate
  it and forward props" when `sidebar` is set.
- `CnObjectSidebar` already wraps `NcAppSidebar` + `NcAppSidebarTab`
  cleanly — the per-tab `<NcAppSidebarTab>` rendering loop is the
  single change-site for opening up the tab enum. The built-in tabs
  (Files, Notes, Tags, Tasks, Audit Trail) keep their existing
  components and slot overrides; we only switch the `v-for` source
  when the consumer supplies their own `tabs` array.
- `CnObjectDataWidget` and `CnObjectMetadataWidget` are the canonical
  widgets for object detail panes. They already accept the full
  schema-driven editing surface we need, so a tab `widgets` array
  doesn't need new plumbing — each entry is `{ type, props }` and the
  tab renderer mounts the matching widget.
- `CnDetailPage` already forwards `sidebarProps` through the
  injected `objectSidebarState`. The change is one new field
  (`tabs`) being passed through that same channel.

## Prop-shape decisions

### `CnIndexPage.sidebar`

Two design options were considered:

1. **Boolean + flat fields** — `sidebar=true` plus separate
   `sidebarColumnGroups` / `sidebarFacets` / etc. props. **Rejected**
   — explodes the prop surface and doesn't match how the manifest
   thinks about page config (one `sidebar` config block per page).
2. **Object** — `sidebar: { enabled, columnGroups?, facets?,
   showMetadata?, search? }`. **Chosen** — matches the manifest
   `pages[].config.sidebar` shape 1:1, single prop to drop into the
   page tag, and keeps the index page's existing slot interface
   untouched. The `enabled` boolean inside the object lets a
   manifest declare `sidebar: { enabled: false, ... }` to disable
   without removing config (useful for incremental rollout).

The `search` sub-object is a thin wrapper for the existing
`CnIndexSidebar` search props (`searchPlaceholder`, `searchTabLabel`,
`searchLabel`, `filtersLabel`). Mapping is 1:1 — no rename — the
wrapper just exists so manifest authors think of search as one block.

### `CnObjectSidebar.tabs`

Open-enum array of tab definitions:

```ts
type TabDef = {
  id: string                    // unique within tabs[]
  label: string                 // i18n key (caller-resolved upstream)
  icon?: string                 // MDI icon name (resolved via CnIcon)
  widgets?: WidgetDef[]         // render via widget registry
  component?: string            // OR resolve via customComponents registry
  order?: number                // optional ordering (mirrors NcAppSidebarTab.order)
}

type WidgetDef = {
  type: 'data' | 'metadata' | string  // built-in or custom widget id
  props?: object                       // forwarded to the widget
}
```

A tab MUST have either `widgets` or `component` — never both. When
both are set, `component` wins and a console warning is logged at
mount time so misconfigurations are visible during development.

Why an array of tab defs instead of a single richer `<Tab>`
component the consumer drops in?

- The manifest is JSON-only — no Vue components in JSON. The
  declarative shape MUST round-trip through `manifest.json` cleanly.
- The `widgets[]` field lets a tab be 100% declarative for the
  common case (data widget + metadata widget), so most apps will
  never need the registry escape hatch.
- The `component` registry escape hatch covers the long tail
  (custom logic, third-party embeds) without forcing every consumer
  to build a custom widget.

### Backwards compatibility

| Existing surface                          | After change                  |
|-------------------------------------------|-------------------------------|
| `CnIndexPage` slots (`#header`, `#actions`, `#tabs`, `#row-actions`, …)  | Unchanged. `sidebar` prop is purely additive. |
| `CnIndexSidebar` standalone use            | Unchanged. The new `CnIndexPage.sidebar` mounts an internal copy; consumers using the slot interface continue to wire their own `CnIndexSidebar`. |
| `CnObjectSidebar` `hiddenTabs` prop        | Unchanged. When `tabs` is unset, default tabs render (and `hiddenTabs` filters them) as today. |
| `CnObjectSidebar` `#tab-files`/`#tab-notes`/`#tab-tags`/`#tab-tasks`/`#tab-audit-trail`/`#extra-tabs` slots | Unchanged when `tabs` is unset. When `tabs` IS set, those slots no longer apply — the consumer is in declarative-mode and routes overrides through the `tabs[].component` registry instead. The component falls back gracefully: a tab with neither `widgets` nor `component` renders an empty placeholder with a console warning. |
| `CnDetailPage.sidebarProps`                | Unchanged shape. `sidebarProps.tabs` is a new optional field forwarded through `objectSidebarState`. |
| `manifest.json` v1.0 manifests             | Unchanged. The new `config.sidebar` and `config.sidebarProps.tabs` fields are optional; v1.0 manifests don't reference them. |

## Schema deltas (kept surgical)

The `manifest-page-type-extensions` change is editing
`pages[].type` enum and `$defs.page` concurrently. To minimize
merge friction:

- This change does NOT add new `$defs` entries. The new fields
  are documented in this design doc and described inline in
  the schema's `pages[].config` description. Validation
  enforcement lives in `validateManifest.js` for now; a later
  `manifest-config-defs` change can promote the inline shapes
  to formal `$defs.indexSidebar` / `$defs.detailSidebarTab`
  once both companion changes have landed.
- This change does NOT touch the `pages[].type` enum. That's
  exclusively the page-type-extensions change's territory.
- This change DOES bump the schema's `version` to the next
  semver patch (`1.0.0` → `1.0.1`). The page-type-extensions
  change bumps the same field; whichever lands first picks the
  number, the other rebases onto it. Patch-level bumps avoid
  signaling breaking changes — both additions are purely
  additive.

## Validator rules added

`validateManifest.js` adds:

1. For `pages[].type === 'index'` with a `config.sidebar` field:
   `config.sidebar` MUST be an object; if `enabled` is set it MUST be a
   boolean; if `columnGroups` is set it MUST be an array; if `facets`
   is set it MUST be an object. Unknown sub-fields are tolerated
   (forward-compat with future `CnIndexSidebar` props).
2. For `pages[].type === 'detail'` with a `config.sidebarProps.tabs`
   field: `tabs` MUST be an array; each entry MUST have an `id` (string)
   and a `label` (string); each entry MUST have either `widgets` (array)
   OR `component` (string), never both.

The validator is intentionally loose — runtime warnings inside the
components (console.warn for unknown widget types, missing registry
component, conflicting tab fields) cover the rest. The strict CI
validator (Ajv against the schema) takes over at build time.

## Component pseudocode

### `CnIndexPage` extension

```vue
<template>
  <div class="cn-index-page">
    <!-- existing header, actions, body -->

    <!-- NEW: auto-mounted index sidebar when sidebar.enabled -->
    <CnIndexSidebar
      v-if="resolvedSidebar.enabled"
      :schema="schema"
      :search-value="searchValue"
      :visible-columns="visibleColumns"
      :column-groups="resolvedSidebar.columnGroups || []"
      :facet-data="resolvedSidebar.facets || {}"
      :show-metadata="resolvedSidebar.showMetadata !== false"
      v-bind="resolvedSidebar.search || {}"
      @search="$emit('search', $event)"
      @columns-change="$emit('columns-change', $event)"
      @filter-change="$emit('filter-change', $event)" />
  </div>
</template>

<script>
export default {
  props: {
    sidebar: { type: Object, default: null },
    // existing props…
  },
  computed: {
    resolvedSidebar() {
      // null sidebar prop = sidebar disabled (legacy slot-driven mode).
      // explicit object with enabled !== false = mount embedded sidebar.
      return this.sidebar && this.sidebar.enabled !== false
        ? this.sidebar
        : { enabled: false }
    },
  },
}
</script>
```

### `CnObjectSidebar` extension

```vue
<template>
  <NcAppSidebar … >
    <!-- BACKWARDS-COMPATIBLE BRANCH: render hard-coded tabs -->
    <template v-if="!hasCustomTabs">
      <NcAppSidebarTab v-if="!isTabHidden('files')" id="files" …>
        <slot name="tab-files" …><CnFilesTab … /></slot>
      </NcAppSidebarTab>
      <!-- … existing notes/tags/tasks/auditTrail tabs … -->
      <slot name="extra-tabs" />
    </template>

    <!-- NEW BRANCH: custom tabs[] drives rendering -->
    <template v-else>
      <NcAppSidebarTab
        v-for="(tab, idx) in tabs"
        :id="tab.id"
        :key="tab.id"
        :name="tab.label"
        :order="tab.order ?? idx + 1">
        <template v-if="tab.icon" #icon>
          <CnIcon :name="tab.icon" :size="20" />
        </template>

        <!-- Widget array path -->
        <div v-if="!tab.component" class="cn-object-sidebar__tab-widgets">
          <component
            :is="resolveWidget(w.type)"
            v-for="(w, wIdx) in tab.widgets || []"
            :key="wIdx"
            v-bind="{ ...sharedWidgetProps, ...(w.props || {}) }" />
        </div>

        <!-- Component registry escape hatch -->
        <component
          v-else
          :is="customComponents[tab.component]"
          v-bind="sharedTabProps" />
      </NcAppSidebarTab>
    </template>
  </NcAppSidebar>
</template>

<script>
import { CnObjectDataWidget } from '../CnObjectDataWidget/index.js'
import { CnObjectMetadataWidget } from '../CnObjectMetadataWidget/index.js'

const BUILTIN_WIDGETS = {
  data: CnObjectDataWidget,
  metadata: CnObjectMetadataWidget,
}

export default {
  inject: { cnCustomComponents: { default: () => ({}) } },
  props: {
    tabs: { type: Array, default: null },
    customComponents: { type: Object, default: null },
    // existing props…
  },
  computed: {
    hasCustomTabs() { return Array.isArray(this.tabs) && this.tabs.length > 0 },
    effectiveCustomComponents() {
      return this.customComponents || this.cnCustomComponents || {}
    },
  },
  methods: {
    resolveWidget(type) {
      if (BUILTIN_WIDGETS[type]) return BUILTIN_WIDGETS[type]
      const c = this.effectiveCustomComponents[type]
      if (!c) {
        console.warn(`[CnObjectSidebar] Unknown widget type "${type}"`)
        return null
      }
      return c
    },
  },
}
</script>
```

## Open design questions

1. **Should `widgets[].type` use a different keyword to avoid
   colliding with future `widget.type` semantics inside dashboards?**
   The dashboard convention is also `widgets[]`; we considered
   `widgets[].kind` to disambiguate. Decision: keep `type` —
   parallel naming makes the manifest read consistently across
   page types, and the two `widgets[]` arrays live under different
   parents (dashboard layout vs sidebar tab) so there's no actual
   collision.
2. **Should `CnIndexPage.sidebar` and `CnDetailPage.sidebar` share a
   prop name?** Today `CnDetailPage.sidebar` is a Boolean activating
   the right-hand object sidebar. The new `CnIndexPage.sidebar` is
   an Object. Inconsistent, but renaming `CnDetailPage.sidebar`
   breaks backwards compat. Decision: keep the existing
   `CnDetailPage.sidebar` Boolean as-is; consumers hand custom tabs
   in via `sidebarProps.tabs`. A future change can promote
   `CnDetailPage.sidebar` to an Object once the existing Boolean
   has been deprecated for a release cycle.
3. **Should the validator enforce uniqueness of `tabs[].id`?**
   `NcAppSidebarTab` uses `id` for the active-tab tracking, so
   duplicate ids would silently break activation. Decision: yes,
   the validator MUST flag duplicate `tabs[].id` (mirrors the
   existing `pages[].id` uniqueness rule).
4. **What about the `register` / `schema` / `objectId` plumbing
   inside custom widgets?** The pseudo-code passes
   `sharedWidgetProps` (including `objectId`, `register`, `schema`,
   `apiBase`) to every widget so custom widgets get the same
   context the built-in tabs do today. Documented in the spec.
5. **Does `pages[].config.sidebar` for `type:"index"` collide with
   any existing config shape?** No — `type:"index"` config currently
   accepts `{ register, schema, columns, actions }` with
   `additionalProperties: true` at the schema level. The new
   `sidebar` field is purely additive.

## Migration path

Apps already using the slot-based sidebar in `CnIndexPage` keep
working unchanged. To migrate:

1. Replace the manual `<CnIndexSidebar>` mount with
   `<CnIndexPage :sidebar="{ enabled: true, ...opts }">`.
2. Remove the slot wiring; the index page now owns the sidebar
   state.
3. Move custom column groups / facets from the slot into the
   `sidebar.columnGroups` / `sidebar.facets` config block.

For `CnObjectSidebar`, the migration is opt-in:

1. Apps satisfied with the default tab set (Files / Notes / Tags /
   Tasks / Audit Trail) make NO changes.
2. Apps that today wire `extra-tabs` via the slot can move their
   tabs into the `tabs` array — preserving the built-ins requires
   re-listing them explicitly (since `tabs` REPLACES the defaults,
   it does not merge with them). Alternatively keep `tabs`
   unset and continue using the `extra-tabs` slot.
