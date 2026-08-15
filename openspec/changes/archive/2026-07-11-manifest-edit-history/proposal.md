## Why

OpenBuilt's builder edits a manifest live (`useManifestEditor` mutates a working copy of the manifest JSON), but there is **no undo/redo**: a mis-drag of a widget, an accidental page deletion, or a bad bulk edit is unrecoverable short of discarding the whole session. The builder-undo-redo change in openbuild needs a history primitive, and per fleet convention (Vue/shared logic lives in nc-vue; leaves publish via the `beta` dist-tag) that primitive belongs here as a **leaf** in the shared library — framework-agnostic core plus a thin Vue 2.7 composable — so any manifest-editing consumer (OpenBuilt today, future form/manifest editors) gets the same tested semantics instead of re-implementing a stack per app.

The library already ships `diffManifest` / `mergeManifestDelta`, so the obvious question — store history as full snapshots or as deltas — must be answered against those utils' *actual* semantics. `diffManifest`'s own contract disqualifies deltas for history storage: deleting a plain (non-keyed) object key is **not expressible** as a delta, and id-less keyed arrays degrade to whole-array replacement. Snapshots win on correctness (see design.md D1).

## What Changes

- **New util `src/utils/manifestEditHistory.js`** — `createManifestEditHistory({ limit = 100, coalesceMs = 0 })` returning `{ push(state, label?), undo(), redo(), canUndo, canRedo, clear(), current, size }`. Pure JS, no Vue import, unit-testable in isolation.
- **Bounded snapshot stack** — full deep-cloned snapshots, deep-frozen, with structural sharing against the previous entry (unchanged subtrees reuse the prior frozen reference). Oldest entries evict when `limit` is exceeded.
- **Branch discard** — `push()` after one or more `undo()` calls discards the redo tail (standard editor semantics).
- **Keystroke coalescing** — consecutive pushes within `coalesceMs` carrying the same `label` replace the top entry instead of appending; `coalesceMs: 0` (default) disables. Timestamp-compared at push time — no timers, the util stays synchronous.
- **Clone/freeze discipline** — `push()` clones the incoming state before storing; stored snapshots are deep-frozen; `current`, `undo()`, and `redo()` hand out the frozen stored reference. Consumers can never mutate history, and later mutation of the pushed source object never alters history.
- **New composable `src/composables/useManifestEditHistory.js`** — thin Vue 2.7 wrapper exposing reactive `canUndo` / `canRedo` / `size` / `current` refs over the core util. Optional; the core has zero Vue dependency.
- **Barrel exports** — core from `src/index.js`, composable via `src/composables/index.js` + `src/index.js`, matching how `diffManifest` / `useTenantContext` are exported today.
- **Docs** — `docs/utilities/create-manifest-edit-history.md` and `docs/composables/use-manifest-edit-history.md` following the existing util/composable doc conventions (`check:docs` / `check:jsdoc` clean).
- **No BREAKING changes.** Purely additive leaf; no existing export, component, or loader path changes.

## Capabilities

### New Capabilities

- **manifest-edit-history** — `createManifestEditHistory` (bounded snapshot undo/redo stack: limit eviction, branch discard, coalescing, clone+freeze discipline) and the `useManifestEditHistory` Vue 2.7 composable wrapper.

### Modified Capabilities

- None. (`manifest-delta-merge` is referenced but untouched — history deliberately does **not** store deltas; see design.md D1.)

## Impact

- **Code:** `src/utils/manifestEditHistory.js` (new), `src/composables/useManifestEditHistory.js` (new), `src/index.js` + `src/composables/index.js` (export lines), `tests/utils/manifestEditHistory.spec.js` + `tests/composables/useManifestEditHistory.spec.js` (new), `docs/utilities/create-manifest-edit-history.md` + `docs/composables/use-manifest-edit-history.md` (new).
- **Consumers:** None required to change. The downstream beneficiary is **openbuild** (builder-undo-redo change consumes this leaf; wiring, keyboard shortcuts, and UI live there). Published via the `beta` dist-tag as usual.
- **Theming:** None — no components, no CSS.
- **Cross-repo:** openbuild's builder-undo-redo change depends on this landing in a published beta; no ADR amendment required (additive utility, no architectural decision changes).
