# createManifestEditHistory

Bounded, synchronous undo/redo history over manifest-shaped JSON. Pure JS, no Vue import — the primitive behind OpenBuilt's builder undo/redo (and any future manifest/form editor that needs the same tested semantics instead of re-implementing a stack per app).

```js
import { createManifestEditHistory } from '@conduction/nextcloud-vue'

const history = createManifestEditHistory({ limit: 100, coalesceMs: 500 })

history.push(manifest) // record the initial state
manifest = { ...manifest, /* user edit */ }
history.push(manifest, 'edit:page-title')

if (history.canUndo) manifest = history.undo()
if (history.canRedo) manifest = history.redo()
```

| Param | Type | Description |
|-------|------|-------------|
| `limit` | `number` | Maximum number of stored snapshots. The oldest entry is evicted once a push would exceed it. Default `100`. |
| `coalesceMs` | `number` | Coalescing window in ms. `push(state, label)` within `coalesceMs` of the previous push, at the top of the stack, with the same non-empty `label`, replaces the top entry instead of appending. `0` (default) disables coalescing. |
| `now` | `Function` | Injectable clock used to timestamp pushes and evaluate the coalescing window. Default `Date.now`. Pass a fake clock in tests to make the window deterministic. |

Returns `{ push(state, label?), undo(), redo(), clear(), canUndo, canRedo, current, size }`. `canUndo` / `canRedo` / `current` / `size` are plain getters (not reactive) — see [`useManifestEditHistory`](./composables/use-manifest-edit-history.md) for a reactive Vue 2.7 wrapper.

## Why full snapshots, not `diffManifest` deltas

The library already ships [`diffManifest`](./diff-manifest.md) / [`mergeManifestDelta`](./merge-manifest-delta.md), but their contract disqualifies deltas for history storage: deleting a plain (non-keyed) object key is not expressible as a delta (`mergeManifestDelta` only ever recurses and adds/patches plain-object keys, never deletes one), and deltas are forward-only, so undo would need reverse deltas or a re-diff against a retained base — reintroducing snapshots anyway. Each history entry is therefore a full deep-cloned snapshot; see `openspec/changes/manifest-edit-history/design.md` (D1) for the full rationale.

## Semantics

- **Clone on push, freeze on store.** `push(state)` never stores the caller's reference — it deep-clones `state` before storing, so mutating the source object afterwards never alters history. Stored snapshots are deep-frozen (root and every nested object/array); `current`, `undo()`, and `redo()` hand back the frozen stored reference directly (no defensive re-clone on read).
- **Structural sharing.** Each push walks the new snapshot against the previous (already-frozen) entry and reuses the previous entry's frozen subtree reference wherever a subtree is deep-equal, instead of cloning it again. A manifest edit that touches one page keeps every other page reference-identical across the two history entries.
- **No-op on unchanged state.** A push whose state deep-equals `current` does not create a new entry.
- **Branch discard.** A `push()` while the cursor sits below the top (some `undo()`s happened since the last push) discards the redo tail before appending — standard editor semantics. A post-undo push never coalesces, even when its label matches the discarded entry's.
- **Bounded eviction.** Exceeding `limit` evicts the oldest entry so `size` never grows past it.
- **`undo()` / `redo()` at the ends return `null`** and leave `current`, `size`, and the flags unchanged — consumers can wire buttons off `canUndo` / `canRedo` without extra guards.
- **Coalescing is opt-in per call.** Pass a `label` (e.g. `'edit:page-title'`) to `push()`; only same-label pushes inside `coalesceMs` merge. Omit the label, use a different label, or push outside the window, and the entry always appends.

## Contract

Pushed state must be JSON-safe plain data (the manifest contract) — functions, `Date` instances, and circular references are not supported; the clone/freeze pass assumes plain objects, arrays, and scalars.
