## 1. Core util (pure, Vue-free)

- [ ] 1.1 Create `src/utils/manifestEditHistory.js` — factory `createManifestEditHistory({ limit = 100, coalesceMs = 0, now = Date.now })` returning `{ push(state, label?), undo(), redo(), canUndo, canRedo, clear(), current, size }` (flags/`current`/`size` as plain getters). No `vue` import.
- [ ] 1.2 Implement the bounded stack: append on push; evict the oldest entry when `size` would exceed `limit`; `undo()`/`redo()` move the cursor and return the new current state or `null` at the ends without mutating anything.
- [ ] 1.3 Implement branch discard: a `push()` while the cursor is below the top drops the redo tail before appending.
- [ ] 1.4 Implement coalescing: replace-top instead of append when `coalesceMs > 0`, previous push was within the window (via the injectable `now` clock), both labels are equal and non-empty, and no `undo()` intervened; `coalesceMs: 0` disables.
- [ ] 1.5 Implement clone + freeze discipline: deep-clone incoming state on push (JSON-safe clone, same idiom as `src/utils/diffManifest.js`), deep-freeze the stored snapshot, apply structural sharing against the previous frozen snapshot (reuse deep-equal subtree references), and make a push that deep-equals `current` a no-op.
- [ ] 1.6 Export `createManifestEditHistory` from `src/index.js` (alongside the existing `diffManifest`/`mergeManifestDelta` export lines).

## 2. Vue 2.7 composable wrapper

- [ ] 2.1 Create `src/composables/useManifestEditHistory.js` — wraps a core instance; exposes `push`/`undo`/`redo`/`clear` and reactive refs `canUndo`, `canRedo`, `size`, `current` refreshed after every mutating call (`ref` from `'vue'`, following the `src/composables/useTenantContext.js` pattern; module-level JSDoc contract block like its neighbours).
- [ ] 2.2 Export `useManifestEditHistory` from `src/composables/index.js` and re-export it from `src/index.js` (matching how `useTenantContext` is barrelled).

## 3. Unit tests (jest — repo runner; specs under `tests/`)

- [ ] 3.1 Create `tests/utils/manifestEditHistory.spec.js` covering the bounded-stack requirement: push/read-back, limit-3 eviction walk, default limit 100.
- [ ] 3.2 Add undo/redo traversal cases to `tests/utils/manifestEditHistory.spec.js`: undo returns previous, redo restores, null no-op at both ends, interleaved push/undo/redo determinism with `canUndo`/`canRedo` assertions.
- [ ] 3.3 Add branch-discard cases: push after double-undo clears `canRedo` and makes the discarded states unreachable.
- [ ] 3.4 Add coalescing cases using an injected fake `now`: same-label-in-window merges, different labels append, outside-window appends, default-off appends, undo breaks the run.
- [ ] 3.5 Add immutability cases: source mutation after push does not alter history; returned snapshots (root and nested) are `Object.isFrozen`; deep-equal re-push is a no-op; structural sharing (unchanged subtree of consecutive snapshots is reference-identical).
- [ ] 3.6 Add `clear()` cases: empties entries and coalescing state; fresh-history behaviour afterwards.
- [ ] 3.7 Create `tests/composables/useManifestEditHistory.spec.js`: reactive `canUndo`/`canRedo`/`current` across push/undo, `{ limit: 2 }` delegation to the core, and barrel-export resolution (`createManifestEditHistory` + `useManifestEditHistory` importable from `src/index.js`).

## 4. Docs

- [ ] 4.1 Create `docs/utilities/create-manifest-edit-history.md` following the existing utility doc format (`docs/utilities/build-manifest.md` as template: intro, import example, options/param table, return shape, semantics notes incl. clone/freeze contract and coalescing).
- [ ] 4.2 Create `docs/composables/use-manifest-edit-history.md` following the composable doc convention (`docs/composables/use-tenant-context.md` as template), cross-linking the utility page.
- [ ] 4.3 Run `npm run check:docs` and `npm run check:jsdoc`; fix any gaps the new modules introduce.

## 5. Verification

- [ ] 5.1 `npm test` green including the two new spec files.
