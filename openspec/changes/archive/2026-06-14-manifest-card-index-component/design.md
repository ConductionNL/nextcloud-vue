# Design: manifest-card-index-component

## Context

`CnIndexPage` is the library's schema-driven index page. Its
`currentViewMode === 'cards'` branch hands rendering off to
`CnCardGrid`, which by default mounts `CnObjectCard` for each row.
Consumers who need a bespoke card UI today have two unsatisfying
escape hatches:

1. `<template #card="{ object }">…</template>` — works at the
   App.vue level but not when the page is dispatched declaratively
   through the manifest (`CnPageRenderer` does not relay scoped
   slots into the dispatched component for arbitrary names).
2. `pages[].type: "custom"` — replaces the entire index page,
   sacrificing actions bar, mass actions, sidebar, dialogs, and
   the manifest-driven page header.

The lib already has a clean precedent for "consumer ships a
component, library resolves it by name": `CnAppRoot` accepts a
`customComponents` registry and provides it via `cnCustomComponents`.
`CnPageRenderer` (`type:"custom"`), `CnObjectSidebar` (custom tab
widgets), `CnSettingsPage` (section bodies / settings widgets) all
inject and resolve names against this registry.

`CnIndexPage` should pull from the same well.

## Goals

- Move bespoke-card consumers off `type:"custom"` without giving up
  any other index-page feature.
- Keep a single resolution rule so the registry contract is
  uniform across `CnAppRoot` consumers.
- Preserve every existing rendering path (default `CnObjectCard`,
  the `#card` scoped slot, the `#card-actions` slot) unchanged.

## Non-goals

- Per-row component dispatch (e.g. different cards per object
  type). The manifest-driven path is one card component per page;
  consumers needing per-row dispatch use the existing `#card` slot
  and switch internally.
- Extending the table view with the same dispatch — table cells
  already have the `column.widget` field for per-cell dispatch.
- Async resolution / lazy-loading — the customComponents registry
  is a synchronous map. Consumers wrap entries in
  `defineAsyncComponent` themselves when they want lazy behaviour.

## Decisions

### D1 — `cardComponent` is a string registry name

`config.cardComponent` is a `string` referencing a key in the
consumer's `customComponents` registry. Not a component value, not
a path, not a tag name. This matches every other registry-resolved
field in the manifest (`page.component`, `headerComponent`,
`actionsComponent`, slot map values, settings `section.component`,
detail-sidebar `tab.component`, settings widget `type`).

### D2 — Registry lookup with explicit-prop override

Resolution mirrors `CnObjectSidebar.effectiveCustomComponents` and
`CnPageRenderer.effectiveCustomComponents`: the explicit
`customComponents` prop (when set) wins over the injected
`cnCustomComponents`. This lets unit tests pass a registry without
mounting `CnAppRoot`.

```js
effectiveCustomComponents() {
    return this.customComponents ?? this.cnCustomComponents ?? {}
}
```

### D3 — Render-path priority

When the page is in card-grid view mode the rendering order is:

1. **`#card` scoped slot** — explicit App.vue override always wins.
2. **`cardComponent` prop** — registry-resolved consumer card.
3. **`CnObjectCard`** — schema-driven default.

Slot precedence over `cardComponent` matters because the slot is the
only path that survives in apps mid-migration (manifest sets
`cardComponent` but App.vue has not yet been simplified).

### D4 — Props passed to the resolved component

The resolved card component receives:

```vue
<component
  :is="resolvedCardComponent"
  :item="object"
  :object="object"
  :schema="schema"
  :register="effectiveRegister"
  :selected="isSelected(object)"
  @click="$emit('click', object)"
  @select="toggleSelect(object)" />
```

`item` is the canonical name (matches `CnObjectCard`'s prop and the
detail/sidebar conventions); `object` is the alias for symmetry
with the existing `#card` slot scope (`{ object, selected }`).
Documenting both lets consumers pick whichever feels natural.

`schema` and `register` come from the same props/inject that
`CnIndexPage` already reads (`schema` is a top-level prop;
`register` is read from the `effectiveRegister` computed when set).

### D5 — Unknown name fallback

A `cardComponent` value that does not resolve in the registry logs
`console.warn` and falls back to `CnObjectCard`. Same pattern as
`CnPageRenderer` ("[CnPageRenderer] Custom component … not found").
A misconfigured manifest never blanks the grid.

### D6 — Schema version bump

Schema version goes 1.2.x → 1.3.0 because adding an optional field
to an existing `config` shape is a SemVer-MINOR change in our
versioning convention (additive, backwards-compatible). Predecessor
`manifest-page-type-extensions` bumped 1.0 → 1.1 for an enum
extension on the same principle.

### D7 — `customComponents` prop on CnIndexPage is opt-in, not required

`CnIndexPage` does not need a `customComponents` prop in the
default flow because the `cnCustomComponents` inject path covers
every consumer running through `CnAppRoot`. The explicit prop
exists only so unit tests (and consumers mounting `CnIndexPage`
without `CnAppRoot`) can pass a registry directly.

## Alternatives considered

### A1 — Per-row dispatch via a `cardComponent` function prop

Reject. Function props are non-serialisable, so they cannot live
in a manifest. The whole point of this change is to keep manifest
authors in the schema-driven track.

### A2 — Hard-code the per-app card in CnCardGrid

Reject. `CnCardGrid` is a primitive used outside `CnIndexPage`;
hard-coding a per-app branch in there is the wrong layer.

### A3 — Re-route through `type:"custom"` with sugar

Reject. `type:"custom"` discards every other index-page feature;
sugar for it doesn't fix the core problem.

### A4 — Inline `cardComponent` is also a per-cell `widget`

Reject. `column.widget` is a per-cell dispatch; `cardComponent` is
a per-row dispatch. Conflating them muddies the schema.

## Risks

- Consumers may forget to register the named component in
  `customComponents` and see the warning fallback. The warning
  message points at the same registry the rest of the lib uses,
  so the troubleshooting story is consistent with `type:"custom"`.

## Migration

Consumers move per page:

1. Move the bespoke card Vue file to `src/components/cards/`.
2. Register it in `src/customComponents.js`:
   `customComponents: { OrganisatieCard, … }`.
3. Flip `pages[].type` from `"custom"` to `"index"` and add
   `config.cardComponent: "OrganisatieCard"`.
4. Pass the original config keys (`register`, `schema`, etc.)
   alongside `cardComponent`.

No other changes required.
