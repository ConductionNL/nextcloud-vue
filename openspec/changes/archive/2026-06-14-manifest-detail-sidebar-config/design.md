# Design: Manifest detail sidebar config

## Reuse analysis

- `CnDetailPage` already exposes `sidebar` (Boolean) +
  `sidebarProps` (Object) and forwards both through the
  `objectSidebarState` provide/inject channel. The change is one
  shape promotion + one new field on the channel — no new wiring.
- `CnIndexPage.sidebar` is already an Object (post
  `manifest-abstract-sidebar`). The `show` flag is one new optional
  field on that Object, gated in the existing `resolvedSidebar`
  computed and `v-if`.
- `CnPageRenderer` already reads `currentPage` and dispatches by
  `type`. Adding a `pages[].sidebar.show` read is one additional
  computed; the CSS class + `provide` are additive.
- `CnAppRoot` already provides via `provide()` and renders
  `<slot name="sidebar" />` unconditionally. The change is one
  inject + a `v-if` on the slot.
- `validateManifest.js` already has `validateSidebarConfig` for
  index sidebar shape and detail sidebar tabs. The new rules slot
  in alongside that helper.

## Migration: Boolean → Object on `CnDetailPage.sidebar`

Two strategies were considered:

### Strategy A — additive deprecation (CHOSEN)

Keep the prop name `sidebar` working for both shapes:

- `Boolean` value → treat as
  `{ show: <value>, enabled: <value> }`, log a one-shot
  `console.warn` per component instance the first time the
  Boolean form is observed, pointing at the migration path.
- `Object` value → treat as the new config shape; merge with
  `sidebarProps` for fields that overlap, with the Object form
  winning (and a separate `console.warn` for the overlap).

**Pros:** zero-friction back-compat; every existing app continues
working; the migration is opt-in and discoverable through console
output. Aligns with rules 1–4 of the lib's `CLAUDE.md`
(backwards-compat is non-negotiable for v1.x).

**Cons:** the prop's `type:` declaration becomes
`[Boolean, Object]`, which surfaces as a small wart in
`CnDetailPage.md` / TypeScript shims. Acceptable trade-off.

### Strategy B — rename (REJECTED)

Deprecate `sidebar` (Boolean) and introduce `sidebarConfig`
(Object). Then `CnIndexPage.sidebar` and `CnDetailPage.sidebarConfig`
diverge by name even though they have the same Object shape.

**Pros:** deterministic per-prop type. No `[Boolean, Object]`.

**Cons:** asymmetric naming across the two page components for
identical config; requires touching every consumer; doubles the
migration surface; deprecation cycle is longer because two prop
names need to be maintained simultaneously. The `[Boolean, Object]`
wart is smaller than the asymmetric naming pain.

**Decision: Strategy A.** Rule 1 of the lib (do not break v1.x
consumers) plus the consistency win (one `sidebar` prop name across
both page components, same Object shape) outweighs the type-shape
wart.

## Where `sidebar.show` lives

Three layers, with a clear precedence rule:

| Layer | Location | Applies to | Precedence |
|-------|----------|------------|------------|
| Per-page (canonical override) | `pages[].sidebar.show` | All page types (`index | detail | dashboard | logs | settings | chat | files | custom | …`) | **Highest** |
| Per-config (type-specific) | `pages[].config.sidebar.show` | `index`, `detail` (config object form) | Mid — applied when per-page is unset |
| Component prop | `CnIndexPage.sidebar.show` / `CnDetailPage.sidebar.show` (when used outside the manifest renderer) | `CnIndexPage`, `CnDetailPage` | Component-level only — manifest-driven flow normalises into the per-config shape before it reaches the prop |

When ALL THREE are set, per-page wins. When `pages[].sidebar.show`
and `pages[].config.sidebar.show` disagree, a `console.warn`
fires at render time naming the page id so authors notice the
override. The contract: per-page is "this page in pages[]" — the
broadest possible override, including `type:"custom"` where the
config block is opaque.

### Why per-page is a sibling of `config`, not nested inside

`config` is type-specific and opaque for `type:"custom"`. Putting
the visibility gate inside `config` would either (a) require
custom pages to honour a config field they otherwise own
end-to-end, or (b) leave custom pages with no manifest-declarable
way to hide the sidebar. Promoting `sidebar` to a sibling of
`config` keeps the page-renderer's job simple: read
`page.sidebar?.show` independently of `page.config`.

This is the FIRST non-config sibling field added to `pages[]` since
the manifest spec was written. The schema's `$defs.page` already
permits `headerComponent`, `actionsComponent`, `slots`, and
`component` (for `type:"custom"`) as siblings of `config`, so the
precedent is set.

### Why not collapse `enabled` and `show` into one field on `CnIndexPage.sidebar`?

The two fields have different meanings even though they often
both end up `true`/`false`:

- `enabled` answers "does this page declare sidebar config at all?"
  When `false`/unset, the auto-mount code path is bypassed
  entirely — no `<CnIndexSidebar>` element is rendered, the
  consumer's existing slot-based pattern stays active. Removing
  `enabled` would either force every consumer to re-add slot
  wiring whenever they want to disable the embedded sidebar (UX
  loss) or break legacy slot consumers (backwards-compat loss).
- `show` answers "should the configured sidebar be visible right
  now?" When `false`, the sidebar config is preserved (so a parent
  watcher / feature flag can flip back to `true` later), but the
  visible surface is suppressed.

Concrete example: a consumer wants the sidebar on `wide` viewports
and hidden on `narrow` ones. They keep `enabled: true,
columnGroups: [...]` static and toggle `show` from a layout
watcher. Collapsing into a single field would require them to
restore the entire `columnGroups` / `facets` config every flip.

We DOCUMENT this distinction explicitly in
`docs/components/cn-index-page.md` to avoid the classic
"why-are-there-two-bools" confusion.

## Backwards compatibility

| Existing surface | After change |
|------------------|--------------|
| `<CnDetailPage :sidebar="true">` | Unchanged. Boolean `true` becomes `{ show: true, enabled: true }` internally; the page activates `objectSidebarState` exactly as today. A one-shot `console.warn` fires per component instance the first time the Boolean form is observed. |
| `<CnDetailPage :sidebar="false">` | Unchanged. Boolean `false` deactivates the sidebar exactly as today. Same one-shot warn. |
| `CnDetailPage.sidebarProps` | Unchanged. Continues to work; if an Object `sidebar` is also set, the Object form wins for overlapping fields with a `console.warn`. |
| `CnIndexPage.sidebar` Object form (post-MAS) | Unchanged shape. The new optional `show` field defaults to `true` so existing consumers keep rendering. |
| `manifest.json` v1.0 / v1.1 manifests | Unchanged. The new `pages[].sidebar` sibling field is optional; pre-existing manifests don't reference it. The `sidebar.show` field defaults to `true` so adding the schema rule doesn't disable any existing sidebar. |
| `CnPageRenderer` for `type:"custom"` pages | Unchanged when `pages[].sidebar` is unset. New behaviour only fires when the manifest opts in. |
| `CnAppRoot` `#sidebar` slot | Unchanged when no descendant signals visibility. The `cnPageSidebarVisible` inject defaults to `true`. |

## Schema deltas (kept surgical)

The parallel `manifest-settings-rich-sections` change is editing
`pages[].config` description text for the `settings` page type.
To minimize merge friction:

- This change adds ONE new top-level property on `$defs.page`:
  `sidebar` (sibling of `config`). The shape is documented inline
  and validated by `validateManifest.js`. No new `$defs` entries.
- The `pages[].config` description gets a short sentence appended
  noting that `config.sidebar` may now be an Object (mirroring the
  index shape) on detail pages, and that `config.sidebar.show:
  false` suppresses the embedded sidebar on either page type. The
  settings-rich-sections change edits a different paragraph in the
  same description, so the merge is mechanical.
- The schema's top-level `version` field is NOT bumped. The
  additions are purely additive under Strategy A; v1.1.0 manifests
  remain valid against the post-change schema with no changes.
- The schema's canonical `$id` URL is unchanged.

## Validator rules added

`validateManifest.js` extends:

1. Per-page top-level `sidebar` field (any type): when set, MUST be
   a plain object; `sidebar.show` MUST be a boolean when present.
   Unknown sub-fields tolerated.
2. `pages[].type === 'index'` `config.sidebar`: existing rules plus
   `show` MUST be boolean when set.
3. `pages[].type === 'detail'` `config.sidebar`: when set, MUST be
   either Boolean (legacy) OR a plain object. When an object,
   `show` and `enabled` MUST be boolean when set, `register` /
   `schema` / `title` / `subtitle` MUST be strings when set,
   `hiddenTabs` MUST be an array of strings when set, `tabs`
   delegates to the existing `manifest-abstract-sidebar` rules
   (under `config.sidebar.tabs` for the new shape; the legacy
   `config.sidebarProps.tabs` path also continues to validate).

The validator stays loose — runtime warnings inside the
components (deprecation warning on the Boolean form,
override-conflict warning when both `pages[].sidebar.show` and
`config.sidebar.show` are set) cover the rest. The strict CI
validator (Ajv) fires only on the rules above.

## Component pseudocode

### `CnDetailPage` — `sidebar` shape promotion

```vue
<script>
export default {
  props: {
    /**
     * Sidebar configuration. Accepts:
     *   - Boolean (legacy, deprecated): `true` activates the
     *     external sidebar; `false` deactivates. A one-shot
     *     console.warn is logged on first observation per
     *     component instance.
     *   - Object (preferred): { show, enabled, register, schema,
     *     hiddenTabs, title, subtitle, tabs } — same shape as the
     *     manifest config block.
     */
    sidebar: {
      type: [Boolean, Object],
      default: false,
    },
    sidebarProps: { type: Object, default: () => ({}) },
    // …
  },
  computed: {
    /**
     * Normalised sidebar config object regardless of input shape.
     * Boolean form maps to { show, enabled }. Object form passes
     * through. Object overrides any overlapping `sidebarProps`
     * field (with a console.warn).
     */
    resolvedSidebar() {
      const cfg = this.sidebar
      if (typeof cfg === 'boolean') {
        if (!this.__deprecationWarned) {
          console.warn('[CnDetailPage] :sidebar=Boolean is deprecated; pass an Object …')
          this.__deprecationWarned = true
        }
        return { show: cfg, enabled: cfg }
      }
      if (cfg && typeof cfg === 'object') {
        // Default show/enabled to true when omitted.
        return { show: cfg.show !== false, enabled: cfg.enabled !== false, ...cfg }
      }
      return { show: false, enabled: false }
    },
    sidebarActive() {
      return this.resolvedSidebar.show !== false && this.resolvedSidebar.enabled !== false
    },
  },
  methods: {
    syncSidebarState() {
      if (!this.hasExternalSidebar) return
      const r = this.resolvedSidebar
      if (this.sidebarActive && this.objectType && this.objectId) {
        this.objectSidebarState.active = true
        this.objectSidebarState.open = this.sidebarOpen
        this.objectSidebarState.objectType = this.objectType
        this.objectSidebarState.objectId = this.objectId
        this.objectSidebarState.title = r.title || this.sidebarProps.title || this.title || ''
        this.objectSidebarState.subtitle = r.subtitle || this.sidebarProps.subtitle || this.subtitle || ''
        this.objectSidebarState.register = r.register || this.sidebarProps.register || ''
        this.objectSidebarState.schema = r.schema || this.sidebarProps.schema || ''
        this.objectSidebarState.hiddenTabs = r.hiddenTabs || this.sidebarProps.hiddenTabs || []
        this.objectSidebarState.tabs = r.tabs ?? this.sidebarProps.tabs
      } else {
        this.objectSidebarState.active = false
        this.objectSidebarState.tabs = undefined
      }
    },
  },
}
</script>
```

### `CnIndexPage` — `show` flag

```vue
<template>
  <div class="cn-index-page">
    <!-- existing header/actions/body -->

    <CnIndexSidebar
      v-if="resolvedSidebar.enabled && resolvedSidebar.show !== false"
      :schema="schema"
      …/>
  </div>
</template>

<script>
export default {
  computed: {
    resolvedSidebar() {
      if (this.sidebar && this.sidebar.enabled !== false) {
        return this.sidebar
      }
      return { enabled: false }
    },
  },
}
</script>
```

### `CnPageRenderer` — page-level `sidebar.show`

```vue
<template>
  <div
    v-if="currentPage"
    :data-page-id="currentPage.id"
    :class="['cn-page-renderer', { 'cn-page-renderer--no-sidebar': !pageSidebarVisible }]">
    <component …/>
  </div>
</template>

<script>
import { ref, provide, computed } from 'vue'

export default {
  setup() {
    const pageSidebarVisible = ref(true)
    provide('cnPageSidebarVisible', pageSidebarVisible)
    return { pageSidebarVisible }
  },
  computed: {
    /**
     * Whether the current page's manifest entry permits the host
     * shell's #sidebar slot to render. Reads pages[].sidebar.show
     * (sibling of config); defaults to true.
     */
    currentPageSidebarVisible() {
      const show = this.currentPage?.sidebar?.show
      return show !== false
    },
  },
  watch: {
    currentPageSidebarVisible: {
      immediate: true,
      handler(visible) { this.pageSidebarVisible.value = visible },
    },
  },
}
</script>

<style>
.cn-page-renderer { display: contents; }
.cn-page-renderer--no-sidebar { /* hook for consumer styles; no built-in styles. */ }
</style>
```

### `CnAppRoot` — slot gating

```vue
<template>
  <NcContent :app-name="appId">
    <template v-else>
      <slot name="menu"><CnAppNav … /></slot>
      <NcAppContent>
        <router-view />
        <slot name="header-actions" />
        <slot name="footer" />
      </NcAppContent>
      <slot v-if="cnPageSidebarVisible" name="sidebar" />
    </template>
  </NcContent>
</template>

<script>
export default {
  inject: {
    cnPageSidebarVisible: { default: { value: true } },
  },
}
</script>
```

The `cnPageSidebarVisible` inject is a `ref`; CnAppRoot reads
`.value` through Vue 2's `ref` unwrapping inside templates. When
no descendant `CnPageRenderer` provides it (e.g. consumer mounts
their own page components), the default `{ value: true }` keeps
the slot rendering as today.

## Custom-page sidebar suppression — wiring touchpoints

The `pages[].sidebar.show: false` mechanism for `type:"custom"`
pages requires consumer-side wiring at exactly ONE location: the
host App's CnAppRoot template, IF the consumer's sidebar lives in
the `#sidebar` slot. CnAppRoot internally honours
`cnPageSidebarVisible` (post this change), so consumers writing:

```vue
<CnAppRoot :manifest="manifest">
  <template #sidebar>
    <CnObjectSidebar />
  </template>
</CnAppRoot>
```

get the suppression for free.

Consumers who DON'T use CnAppRoot — i.e. they manually mount
`<CnObjectSidebar>` somewhere in their App.vue alongside a manual
`<router-view>` — must inject `cnPageSidebarVisible` themselves
and gate their sidebar element with it:

```vue
<script>
export default {
  inject: { cnPageSidebarVisible: { default: { value: true } } },
}
</script>
<template>
  <div class="app">
    <router-view />
    <CnObjectSidebar v-if="cnPageSidebarVisible.value" />
  </div>
</template>
```

This is the ONE custom fallback this change adds. It's
intentional — manifest-first apps using CnAppRoot get the new
behaviour for free; consumers who roll their own shell pay
exactly the same one-line wiring cost they pay for any other
inject (like `cnManifest` or `cnTranslate`).

## Open design questions

1. **Should `sidebar.show: false` also clear `objectSidebarState`
   on detail pages?** Yes — it's the more conservative behaviour.
   When the sidebar is hidden, the inject channel goes inactive
   so the host App's `<CnObjectSidebar>` doesn't render stale
   data. Documented in REQ-MDSC-3.
2. **Should `sidebar` apply transitively when set on a parent
   page (e.g. a parent in `menu.children`)?** No — this change
   keeps the per-page entry as the unit of granularity. Cross-page
   inheritance is out of scope; a future change can add it.
3. **Should the deprecation warning include a code-mod hint URL?**
   The warning text references the `cn-detail-page.md`
   migration section. We do not link to a code-mod tool because
   the migration is mechanical (one-line shape change) and will
   typically be done by hand or via grep.
4. **Does the per-page `sidebar` field collide with the schema's
   `additionalProperties: false`?** Today `$defs.page` has
   `additionalProperties: false`; we're adding `sidebar` to the
   declared `properties` so the schema continues to forbid
   unknown fields. The validator's existing handling for unknown
   keys (none — it just skips them) needs no change.

## Migration path

For consumers using `CnDetailPage`:

1. Replace `:sidebar="true"` with
   `:sidebar="{ register: 'leads', schema: 'lead', tabs: [...] }"`.
2. Move any `sidebarProps` Object fields into the new `sidebar`
   Object — `sidebarProps` continues to work but the deprecation
   warning fires once per component instance.
3. Add `show: false` on the new Object when needing to hide the
   sidebar declaratively.

For consumers using the manifest:

1. To hide the sidebar on a custom page, add
   `"sidebar": { "show": false }` as a sibling of `config` on the
   `pages[]` entry. No change to `config`.
2. To hide the sidebar on an index/detail page while keeping
   the rest of the config intact, set
   `config.sidebar.show: false` (preferred — keeps config local
   to the type) OR `pages[].sidebar.show: false` (broadest
   override).

For library hosts (apps shelling via CnAppRoot): no change
required. CnAppRoot consumes the inject internally.

For library hosts NOT using CnAppRoot: wire the
`cnPageSidebarVisible` inject manually as documented above.
