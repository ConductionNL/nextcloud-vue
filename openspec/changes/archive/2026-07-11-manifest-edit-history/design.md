## Context

OpenBuilt's editor holds a working manifest (a plain JSON object) and mutates it as the user drags widgets, renames pages, and edits config. The openbuild builder-undo-redo change needs a history primitive; the shared library is its canonical home (Vue/shared logic lives in nc-vue; leaves publish via `beta`).

The library already owns three relevant utils, verified at HEAD in this worktree:

- `src/utils/diffManifest.js` — `diffManifest(base, edited)` produces the minimal keyed delta such that `mergeManifestDelta(base, diffManifest(base, edited)).manifest` reproduces `edited` **for every keyed array** (`pages` / `widgets` / `menu` / nested `children`). Its docblock states the limitation explicitly: *"deleting a plain (non-keyed) object key is not expressible as a delta — only keyed-array entry removals are."* Additionally, a keyed array whose entries lack the identity field is emitted as a **whole-array replacement** with a `console.warn`.
- `src/utils/mergeManifestDelta.js` — keyed structural merge; returns `{ manifest, orphanedDeltaPaths }` (a wrapper, not the bare manifest); orphaned patches are skipped fail-soft. Non-keyed arrays and scalars replace; plain objects recurse — so a delta can *add or change* plain object keys but never *delete* one.
- `tests/utils/diffManifest.spec.js` + `tests/utils/mergeManifestDelta.spec.js` — round-trip coverage exists for keyed-array edits/removals/reorders, not for plain-key deletion (which is impossible by design).

Test runner note (verified): this repo runs **jest** (`"test": "jest"`, specs under `tests/utils/` and `tests/composables/`), not vitest. All test tasks below target jest — the assertions are runner-portable.

## Goals / Non-Goals

**Goals:**
- A framework-agnostic, synchronous, bounded undo/redo history over manifest JSON: `createManifestEditHistory({ limit, coalesceMs })`.
- Lossless: undo/redo must reproduce every prior state byte-for-byte (deep-equal), including plain-object key deletions.
- Immutable entries: consumers cannot corrupt history by mutating what they pushed or what they read back.
- Keystroke coalescing so rapid edits (typing in a title field) do not flood the stack.
- A thin optional Vue 2.7 composable exposing reactive `canUndo` / `canRedo`.

**Non-Goals:**
- Persisting history across sessions/reloads (in-memory only; openbuild may layer persistence later).
- Undo/redo *UI* (buttons, keyboard shortcuts, toasts) — lives in the openbuild builder-undo-redo change.
- Multi-user / collaborative operational transforms.
- A generic any-shape-history util — the API is manifest-flavoured (JSON-safe plain data) though nothing binds it to the manifest schema.

## Decisions

### D1 — Full-snapshot stack, not a delta stack
**Choice:** Each history entry is a full deep-cloned snapshot of the manifest. Deltas via `diffManifest` / `mergeManifestDelta` were evaluated and rejected for history storage.
**Why (verified against HEAD):**
1. **Deltas are not losslessly invertible for arbitrary edits.** `diffManifest`'s documented limitation: deleting a plain (non-keyed) object key — e.g. removing `page.config.slotColumns` or clearing a widget config field — cannot be expressed as a delta, because `mergeManifestDelta` recurses plain objects and never deletes keys. An undo history that silently cannot represent key deletion would resurrect deleted config on redo — a correctness bug, exactly the class of failure a history util must never have.
2. **No reverse deltas.** Undo needs base←edited inversion; `diffManifest` only produces forward deltas, so a delta stack would have to store both directions (doubling complexity) or re-diff on every undo against a retained base snapshot (reintroducing snapshots anyway).
3. **Degraded granularity is a runtime surprise.** Id-less keyed arrays make `diffManifest` emit whole-array replacements plus `console.warn` — a history util spamming warnings on every keystroke in an id-less manifest is unacceptable.
4. **Memory pressure is bounded and acceptable.** A built-app manifest is JSON in the 10–100 KB range; 100 snapshots ≈ 1–10 MB worst-case *without* sharing. With structural sharing (below), consecutive snapshots differing in one field share almost every subtree, collapsing real usage to roughly the delta footprint anyway — snapshot correctness at near-delta cost.
**Trade-off accepted:** snapshots duplicate data that deltas would minimise; structural sharing recovers most of it, and correctness (losslessness) dominates for an undo primitive.

### D2 — Structural sharing against the previous entry
**Choice:** `push()` deep-clones the incoming state, then walks it against the previous (already-frozen) snapshot and substitutes the previous snapshot's subtree reference wherever the two are deep-equal. Because stored snapshots are deep-frozen (D3), sharing frozen references across entries is safe.
**Why:** Bounds real memory to (one full snapshot) + (changed subtrees per entry) while keeping every entry a complete, independently readable manifest. The deep-equal walk is O(manifest size) per push — negligible at manifest scale and only paid on push, never on undo/redo.

### D3 — Clone on push, deep-freeze stored entries
**Choice:** `push(state)` never stores the caller's reference: it clones (JSON-safe deep clone, matching the `clone()` idiom already used in `diffManifest.js`) and deep-freezes the stored snapshot. `current`, `undo()`, and `redo()` return the frozen stored reference directly (no defensive re-clone).
**Why:** Clone-on-push means later mutation of the editor's working object cannot retroactively alter history. Freeze-on-store means a consumer that tries to mutate `history.current` throws (strict mode) or no-ops instead of corrupting the stack. Returning the frozen reference (not a clone) keeps undo/redo O(1) and makes the immutability contract explicit: the consumer clones the returned state into its own working copy — which OpenBuilt's editor already does when loading a manifest. Freezing is unconditional (not dev-only): `Object.freeze` at manifest scale is cheap and a conditional contract invites production-only bugs.

### D4 — Coalescing via a timestamp window + label match, not timers or transactions
**Choice:** `createManifestEditHistory({ coalesceMs })`: a `push(state, label)` **replaces** the top entry instead of appending when (a) `coalesceMs > 0`, (b) the previous push happened within `coalesceMs`, (c) both pushes carry the same non-empty `label`, and (d) no `undo()` occurred since the previous push. Default `coalesceMs: 0` — coalescing off.
**Why over a debounce timer:** timers make the util asynchronous (pending state that may or may not land, teardown hazards, fake-timer test friction). Timestamp comparison at push time is synchronous, deterministic, and trivially testable by injecting a clock (`now` option, defaulting to `Date.now`).
**Why over an explicit transaction API** (`beginTransaction()`/`commit()`): transactions push bookkeeping onto every consumer call-site; the label+window rule gives the common case (rapid keystrokes into one field share a label like `edit:page-title`) for free, and a consumer that *wants* transaction semantics gets it by simply not pushing until its operation completes. The label condition guarantees two *different* rapid operations (rename then drag) never merge into one undo step.

### D5 — Vue-free core, thin composable wrapper
**Choice:** `src/utils/manifestEditHistory.js` imports nothing from Vue; `canUndo`/`canRedo`/`current`/`size` are plain getters on the returned object. `src/composables/useManifestEditHistory.js` wraps a core instance and mirrors those getters into Vue 2.7 `ref`s (updated after every mutating call), exposing `{ push, undo, redo, clear, canUndo, canRedo, size, current }` with the four reads as refs.
**Why:** Mirrors the established repo split (`mergeManifestDelta` pure util ↔ `useAppManifest` composable). The core stays reusable server-side or in the openbuild preview worker; the composable follows the pattern of `useTenantContext` (Vue 2.7 `ref` from `'vue'`, exported via `src/composables/index.js`). Getters cannot be made reactive by wrapping, hence the explicit ref mirror in the composable rather than `computed` over non-reactive state.

### D6 — Bounded stack semantics
**Choice:** `limit` (default 100) counts stored snapshots. Exceeding it evicts the **oldest** entry; the redo tail is discarded on any post-undo `push()` (branch discard); `clear()` empties everything; `size` reports current entry count; `undo()` at the bottom and `redo()` with no tail return `null` and leave state unchanged.
**Why:** Standard editor semantics, matching user expectations from every text editor; `null` (not throw) for exhausted undo/redo lets consumers wire buttons without guards beyond `canUndo`/`canRedo`.

## Risks / Trade-offs

- **Non-JSON-safe values in pushed state** (functions, `Date`, circular refs) → JSON deep clone drops or throws on them. Acceptable: manifests are JSON by definition; document the contract, and the deep-freeze makes accidental violations loud in tests.
- **Structural-sharing deep-equal cost on push** → O(n) per push at manifest scale (~µs–ms); coalescing further cuts push frequency under typing. If profiling ever shows pain, sharing can be dropped without API change (it is an internal optimisation).
- **Frozen `current` surprises a consumer that mutates in place** → documented contract + the openbuild editor already clones on load; freezing fails fast rather than corrupting silently.
- **Coalescing hides intermediate states** → by design; the window defaults off and only merges same-label pushes, so a consumer opts in per interaction type.

## Migration Plan

1. Land util + composable + tests + docs in nc-vue (this change); publish flows through the normal `beta` dist-tag process (outside this change's tasks).
2. openbuild's builder-undo-redo change bumps its `@conduction/nextcloud-vue` beta pin and wires `useManifestEditHistory` into the builder shell.

**Rollback:** Delete the two new modules and their export lines — nothing else references them; no schema, storage, or consumer migration.

## Open Questions

- Should `push()` skip when the incoming state deep-equals `current` (no-op edit)? Lean **yes** — it prevents empty undo steps and the deep-equal is already computed for structural sharing. Spec'd as required behaviour.
- Should the composable also expose `undoLabel`/`redoLabel` (for "Undo rename" tooltips)? Deferred — openbuild's change can request it as a follow-up; labels are already stored per entry so it is additive.
