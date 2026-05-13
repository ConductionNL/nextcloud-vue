# Design — Manifest named-view sidebar

## Decision

Add `pages[].sidebarComponent: string` to the manifest schema and
publish a parallel `cnPageSidebarComponent` reactive provide
channel from `CnPageRenderer`. `CnAppRoot` injects the holder and
mounts the resolved component inside the **default content** of the
`#sidebar` slot. Composes deterministically with the existing
`pages[].sidebar.show` visibility gate (visibility wins).

## Why this shape

### Why `sidebarComponent` (string registry name) instead of a slot prop or schema-side `$ref`

The `customComponents` registry is already the well-trodden path for
every other page-level component reference: `page.component` (for
`type:"custom"`), `page.headerComponent`, `page.actionsComponent`,
`page.cardComponent`, `page.slots`, and the
`pages[].config.sidebarProps.tabs[].component` field added by
`manifest-abstract-sidebar`. Manifest authors already know that
"a string here = a key in `customComponents`" — adding
`sidebarComponent` to the same family means zero new mental model.

A slot-prop approach (`<CnAppRoot :sidebar-components="{...}">`)
was considered and rejected: it forces consumers to maintain a
parallel mapping outside the manifest, which is exactly the
duplication ADR-024 is trying to eliminate. A schema-side `$ref`
to a per-page sub-document was also rejected: the `customComponents`
registry already resolves Vue components, and a `$ref` would only
carry a name string anyway.

### Why a new provide channel instead of extending `cnPageSidebarVisible`

The visibility holder is a `boolean` semantically; conflating it
with a component reference would force every consumer that reads
the holder today to handle a new shape. A parallel
`cnPageSidebarComponent: { value: Component | null }` mirrors the
visibility holder's shape exactly (reactive holder with `.value`)
so the inject pattern is identical, and existing consumers keep
working without changes.

### Why mount inside the slot's default content (not unconditionally)

The consumer's `#sidebar` slot override is the source of truth for
apps that wire their own sidebars (every Conduction app today —
`CnObjectSidebar` + `CnIndexSidebar` siblings in App.vue). If
`CnAppRoot` mounted the resolved component **above** the slot, every
existing app would break the moment they ship a manifest entry
with `sidebarComponent`. By putting the resolved component inside
the slot's **default content**, the consumer's slot override wins
when present and the resolved component is the fallback when the
consumer hasn't overridden the slot.

For opencatalogi specifically — which DOES override the `#sidebar`
slot — adoption requires moving the named-view sidebar component
INTO the `customComponents` registry and the manifest entry; the
slot override gets simplified or removed. That's the migration
intent; the lib change unblocks it.

### Why visibility wins over component

When both `sidebar.show: false` and `sidebarComponent: "X"` are
set on the same page, the visibility gate fires first (slot doesn't
render at all). The alternative — letting `sidebarComponent`
override the visibility — would make the visibility flag
inconsistent across pages with vs. without a sidebarComponent.
Keeping visibility as the outermost gate is the simpler invariant.
The validator emits a `console.warn` in the dev build so manifest
authors notice the dead config.

## Alternatives considered

### A. Extend `pages[].slots` with a `sidebar` slot key

**Rejected** because the host App's `#sidebar` slot lives on
`CnAppRoot`, not on the page component. The existing `slots` map
forwards into the dispatched page component's scoped slots —
adding a `sidebar` key there would either silently no-op (the page
doesn't have a sidebar slot) or require special-casing a "host
slot" set, which complicates the slots map's contract.

### B. Add a `sidebar` config field that accepts an object with `component`

**Rejected** for `type:"detail"` because `pages[].config.sidebar`
already accepts an object shape with `tabs`, `register`, `schema`,
`show`, etc. Adding a `component` key there would conflict with
the per-tab `component` resolution and confuse the precedence with
`tabs[].component`. Keeping the full-sidebar-swap field at the
page level (sibling of `config`) — alongside `headerComponent`,
`actionsComponent`, `cardComponent`, `component` — is the
consistent placement.

### C. Have the consumer pass a `sidebarComponents: { [pageId]: Component }` prop on `CnAppRoot`

**Rejected** because it splits the registry resolution between two
sources of truth (the `customComponents` registry vs. a separate
`sidebarComponents` map). Manifest authors editing JSON only would
not see the binding from the manifest side; it would re-introduce
the duplication that motivated this change in the first place.

## Risks

### R1. A page with `sidebarComponent` but no `customComponents` entry crashes silently

**Mitigation:** the renderer logs a `console.warn` with the
registry name and the page id when resolution fails, and the
holder stays `null` (slot falls through to the consumer's default).
This matches the existing precedent for `cardComponent`,
`headerComponent`, etc. — every registry-name field follows the
same warn-and-fall-through path.

### R2. Apps that override `#sidebar` see no behaviour change after adoption

**Expected.** The fall-through is by design — adoption requires the
consumer to either (a) remove the `#sidebar` slot override and let
the resolved component handle every page, or (b) move the
named-view component into `customComponents` and replace the
override with one that respects `cnPageSidebarComponent.value`.
Documented in the migration guide.

### R3. The existing `pages[].sidebar` (Object form on detail pages, with `tabs[]`) and the new `pages[].sidebarComponent` look similar

**Mitigation:** the schema description for `sidebarComponent`
calls out the difference explicitly — "for a per-page tab config
on the built-in CnObjectSidebar, use `pages[].config.sidebar.tabs`;
for a complete swap of the host App's `#sidebar` content for a
single page, use `pages[].sidebarComponent`". The migration guide
includes a decision tree.

### R4. Vue 2 reactivity + provide/inject

The `cnPageSidebarComponent` holder is mutated in a `watch`er — the
same pattern as `cnPageSidebarVisible`. The holder is created in
`data()` so Vue 2 tracks the `.value` mutation site; descendants
read `holder.value` in computed / template positions and
re-render. This pattern is already proven in the codebase.

## Implementation notes

- The new provide key is `cnPageSidebarComponent`. Holder shape:
  `{ value: Component | null }`. Default (when no `CnPageRenderer`
  ancestor) is `{ value: null }` — inject default in `CnAppRoot`.
- The renderer creates the holder in `data()` exactly like
  `pageSidebarVisible` so Vue 2 reactivity tracks `.value`
  mutations. The watcher mirrors the visibility watcher.
- `CnAppRoot`'s `<slot name="sidebar">` template gains a default
  content block that renders `<component :is="...">` when the
  inject's `.value` is non-null. The slot override path is
  unchanged.
- The validator emits one error when `sidebarComponent` is set but
  not a non-empty string; otherwise it's free-form (matching
  `cardComponent`, `headerComponent`, `actionsComponent`).
- Schema bump: top-level `version` field stays put per the
  `manifest-config-defs` convention (only the validator-touched
  changes bump). The `pages[]` description gets a new line
  documenting `sidebarComponent`. No new `$defs`.
