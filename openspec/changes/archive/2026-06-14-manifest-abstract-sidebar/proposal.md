# Manifest abstract sidebar

## Why

The fleet-wide adoption of the `@conduction/nextcloud-vue` JSON
manifest pattern (Hydra ADR-024) treats `manifest.json` as the
single source of truth for an app's shell — routes, navigation,
page types, dashboards. The audit reviewing the current
nextcloud-vue surface found two gaps that force every consumer
back into bespoke per-app code for the **sidebar**:

1. **Index pages have no manifest-declarable sidebar.** `CnIndexPage`
   exposes the right-side sidebar through slots only. Apps still
   wire `CnIndexSidebar` themselves and re-implement the
   schema-to-filter-to-search-to-columns plumbing every time. None
   of the search / column-visibility / facet configuration is
   reachable from `manifest.json`.

2. **Detail-page sidebar tabs are a closed enum.** `CnDetailPage`
   accepts `sidebar` / `sidebarProps` props that forward into
   `CnObjectSidebar`. But the tabs `CnObjectSidebar` renders are
   **hard-coded** to Files / Notes / Tags / Tasks / Audit Trail.
   The manifest can hide tabs (`hiddenTabs`) but cannot **add**
   tabs without dropping into the `extra-tabs` slot — i.e. writing
   a custom Vue component for every tab the consumer needs beyond
   the built-ins. The `manifest-page-type-extensions` change closes
   the page-type enum but doesn't touch the sidebar tab enum.

Together these two gaps mean adopting apps end up with a
half-declarative shell: pages route through the manifest, but the
sidebar — the part of the UI the user spends most time in for
detail work — falls back to bespoke wiring. That defeats the
declarative promise of the manifest.

## What Changes

Make the sidebar fully manifest-driven on both index and detail
pages with backwards-compatible additive props:

- **`CnIndexPage`** gains an optional `sidebar` prop. When set,
  the page auto-mounts and wires `CnIndexSidebar` with its full
  prop surface (search / columnGroups / facets / showMetadata).
  When unset, the existing slot-based interface is unchanged.
  The manifest schema gains `pages[].config.sidebar` for
  `type:"index"` pages.

- **`CnObjectSidebar`** gains an optional `tabs` prop accepting
  an open-enum array of tab definitions:
  `{ id, label, icon?, widgets?, component? }`. When `tabs` is
  set, that array drives tab rendering (replacing the hard-coded
  defaults). Each tab can render either:
  (a) a list of `widgets` resolved against the existing widget
  components (`CnObjectDataWidget`, `CnObjectMetadataWidget`,
  etc.), or
  (b) a `component` resolved against the consumer's
  `customComponents` registry.
  When `tabs` is unset, the existing built-in tab set is
  preserved.

- **`CnDetailPage`** forwards `sidebarProps.tabs` through the
  existing `objectSidebarState` injected channel so that a
  manifest can drive tab definitions end-to-end without the
  consumer wiring `CnObjectSidebar` directly.

- **The schema** (`src/schemas/app-manifest.schema.json`) admits:
  - `pages[].config.sidebar` for `type:"index"` (the
    enabled/columnGroups/facets/showMetadata/search shape).
  - `pages[].config.sidebarTabs` for `type:"detail"` as a thin
    convenience layer that flows into `sidebarProps.tabs` at
    dispatch time.
  - The schema's `version` field bumps from `1.0.0` to the next
    semver patch; the canonical schema URL is unchanged. Schema
    additions stay deliberately surgical because the
    `manifest-page-type-extensions` change is editing the same
    file concurrently.

## Problem

The two gaps above force consuming apps to either:

- **Bypass the manifest** — drop into `type:"custom"` for any
  detail page that needs more than Files / Notes / Tags / Tasks /
  Audit Trail (every domain-specific app — pipelinq, decidesk,
  procest, larpingapp). The page-type-extensions change closes
  one half of this gap; the sidebar half remains.
- **Keep the manifest but bypass the sidebar abstraction** —
  hand-wire `CnIndexSidebar` and `CnObjectSidebar` per page,
  duplicating schema-to-filter / schema-to-columns / tab-binding
  plumbing across every app. This was tolerable when the manifest
  was a future ambition; it's a glaring inconsistency now that
  every other shell concern is declarative.

## Proposed Solution

Two narrow, additive changes to existing components plus a
schema extension. No new components ship with this change — the
abstraction is achieved by opening up two existing component
prop surfaces and routing manifest config through them.

### Index sidebar

`CnIndexPage` accepts:

```jsonc
sidebar: {
  enabled: true,                   // mount CnIndexSidebar
  columnGroups: [...],             // forwards to CnIndexSidebar.columnGroups
  facets: { ... },                 // forwards as facetData
  showMetadata: true,              // forwards
  search: { placeholder: '...' }   // forwards searchPlaceholder etc.
}
```

In manifest form for `type:"index"`:

```jsonc
{
  "id": "decisions",
  "type": "index",
  "config": {
    "register": "decisions",
    "schema": "decision",
    "sidebar": { "enabled": true, "showMetadata": true }
  }
}
```

### Detail sidebar tabs

`CnObjectSidebar.tabs` accepts an open-enum array:

```jsonc
[
  { id: 'overview', label: 'Overview', icon: 'eye',
    widgets: [
      { type: 'data',     props: { /* CnObjectDataWidget props */ } },
      { type: 'metadata', props: { /* CnObjectMetadataWidget props */ } }
    ] },
  { id: 'related', label: 'Related', icon: 'link',
    component: 'MyRelatedTab'   // resolved against customComponents
  }
]
```

In manifest form for `type:"detail"` (via `sidebarProps.tabs` —
keeping existing `sidebarProps` as the single forwarding lane):

```jsonc
{
  "id": "decision",
  "type": "detail",
  "config": {
    "register": "decisions",
    "schema": "decision",
    "sidebar": true,
    "sidebarProps": {
      "tabs": [
        { "id": "overview", "label": "myapp.tabs.overview",
          "widgets": [{ "type": "data" }, { "type": "metadata" }] },
        { "id": "related", "label": "myapp.tabs.related",
          "component": "MyRelatedTab" }
      ]
    }
  }
}
```

Falls back to the closed-enum default tabs (Files / Notes / Tags
/ Tasks / Audit Trail) when `tabs` is absent — backwards
compatible.

## Out of scope

- A built-in Overview / Properties / Metadata tab opt-in for
  `CnObjectSidebar`. The widgets array fully covers that case;
  closing it down would re-introduce the same closed-enum problem.
- Replacing the `objectSidebarState` provide/inject channel.
  `CnDetailPage`'s sidebar wiring stays as-is; we only forward an
  additional field through it.
- A dashboard-style sidebar config (drag/drop tab reorder, user
  customization). Tab order is `tabs[]` order; that's intentional.
- Formal `$defs` for the new sidebar config shapes in the JSON
  Schema — defer to the separate `manifest-config-defs` change so
  this change stays surgical and conflict-free with the
  parallel `manifest-page-type-extensions` work that also
  touches `app-manifest.schema.json`.

## See also

- `nextcloud-vue/openspec/changes/add-json-manifest-renderer/specs/json-manifest-renderer/spec.md` — parent contract; `pages[].config` is type-specific.
- `nextcloud-vue/openspec/changes/manifest-page-type-extensions/` — concurrent sister change opening the page-type enum; schema additions here intentionally additive at distinct anchors.
- Hydra ADR-024 (App manifest fleet-wide adoption) — the convention this change serves.
- `CnObjectSidebar.vue` — current closed-enum tab implementation that this change opens up.
- `CnIndexSidebar.vue` — full prop surface for search / columns / facets that `CnIndexPage` will now embed when `sidebar.enabled` is set.
