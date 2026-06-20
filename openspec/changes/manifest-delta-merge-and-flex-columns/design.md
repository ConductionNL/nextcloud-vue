## Context

`@conduction/nextcloud-vue` renders Conduction apps from a JSON manifest. Two loaders exist:

- `useAppManifest(appId, bundled, options)` — synchronous bundled load, then async backend fetch **deep-merged** over the bundled manifest. Its `deepMerge` (src/composables/useAppManifest.js:234) recurses into plain objects but **replaces arrays wholesale** — there is no key to merge array entries on.
- `useRuntimeManifest(appId, stub)` — v2 loader that **fully replaces** the stub with the fetched manifest (ADR-036 Decision 8). No merge at all.

OpenBuilt persists each built app as a complete manifest blob and renders it via the deep-merge loader. Because the blob is frozen and arrays replace, a built app is permanently severed from its base app's later improvements, and any backend manifest wanting to patch one page must resend `pages[]` in full.

The blocker for keyed merging is identity: the v2 `widgetEntry` schema is `additionalProperties:false` with required `widgetKey, slot, gridX, gridY, gridWidth, gridHeight` and **no `id`**. `widgetKey` is not unique within a page. Pages already have a unique required `id`.

Separately, `CnWidgetGrid` derives columns from a frozen `SLOT_COLUMNS` map (`body`=12, `sidebar`=1) per ADR-036 Decision 2; there is no per-page override.

## Goals / Non-Goals

**Goals:**
- Give v2 widget entries a stable, optional `id` usable as a merge key.
- Provide `mergeManifestDelta(base, delta)` and `diffManifest(base, edited)` as pure, framework-agnostic utilities (testable without Vue).
- Offer an **opt-in** `'delta'` merge mode in both loaders without changing either loader's current default behaviour.
- Make per-slot grid columns overridable from the manifest and via a `CnWidgetGrid` prop, defaulting to today's behaviour.
- Surface unresolvable patches (orphans) the same way unresolved sentinels are surfaced today.

**Non-Goals:**
- OpenBuilt's storage of `baseRef + delta`, the editor diff UI, and server-side resolution — a **separate** OpenBuilt change consumes this foundation.
- Changing v1 deep-merge or v2 full-replace defaults.
- A general JSON Patch (RFC 6902) / JSON Merge Patch (RFC 7386) implementation — see Decisions.
- Reordering `menu[]` or non-`pages`/`widgets` arrays by key (they replace, as today).

## Decisions

### D1 — Keyed structural merge, not RFC 6902 / 7386
**Choice:** A bespoke keyed merge: objects recurse; `pages[]` keyed by `page.id`, `widgets[]` keyed by `widget.id`; deletions via `{ "$op": "remove" }`; reorder via optional `__order: [...ids]`.
**Why:** RFC 7386 (Merge Patch) replaces arrays — the exact problem we have. RFC 6902 (JSON Patch) uses **array indices**, which are fragile the moment the base app reorders or inserts a page, silently corrupting unrelated entries. Manifests already carry stable ids on every mergeable array, so keying on identity is both robust to base drift and minimal to express.
**Alternative considered:** Adopt `fast-json-patch`. Rejected — index-based ops + a new runtime dependency for a problem our own id-keyed merge solves more safely.

### D2 — `id` is optional and additive
**Choice:** Add `id` (string, kebab-case pattern) to `widgetEntry` as **optional**; keep `additionalProperties:false` by listing it explicitly.
**Why:** Thousands of existing widget entries omit it and must stay valid. Delta mode requires `id` only on entries a delta actually targets; `diffManifest` warns when it must diff an id-less array (falls back to whole-array replace for that array, preserving correctness).

### D3 — Delta mode is a third, opt-in strategy
**Choice:** `options.mergeStrategy: 'delta'` on both loaders. When set, the loader treats the fetched payload as a delta and applies `mergeManifestDelta(base, fetched)`; the base is the bundled manifest (`useAppManifest`) or the stub (`useRuntimeManifest`). Absent or `'replace'`/`'deep'`, today's code path runs unchanged.
**Why:** Zero behavioural change for the five current consumers. The branch is explicit and discoverable, and the same `mergeManifestDelta` util is reused client-side by OpenBuilt's editor for live preview.

### D4 — Orphaned patches are non-fatal and surfaced
**Choice:** A delta entry whose key matches nothing in the base is skipped, logged via `console.warn`, and its path pushed onto a returned `orphanedDeltaPaths` ref (parallel to `unresolvedSentinels`).
**Why:** Base drift (a base app deletes a page a delta patched) must not blank the app. Fail-soft + observable matches the existing sentinel-resolution contract and keeps the rendered app usable while signalling the staleness to tooling/admins.

### D5 — Flexible columns resolve in three layers
**Choice:** Resolution order in `CnWidgetGrid`: explicit `columns` prop → `page.config.slotColumns[slotName]` (passed down by `CnPageRenderer`/`CnDetailPage`) → existing `getGridColumns(slotName)` default. `validateManifest` computes the same `resolvedColumns` per slot and enforces `gridX + gridWidth ≤ resolvedColumns`.
**Why:** Prop default `null` and absent `slotColumns` reproduce today's fixed table exactly. The validator must agree with the renderer or a manifest could pass validation yet clip — so the bound is computed, not constant.

### D6 — Pure utils, Vue-free
**Choice:** `mergeManifestDelta` / `diffManifest` live in `src/utils/` as plain functions exported from the barrel, with their own unit tests independent of any component.
**Why:** They are reused by OpenBuilt (possibly server-side via a JS port or as the contract reference) and must be unit-testable without mounting Vue.

## Risks / Trade-offs

- **Base drift orphans a patch** → D4 fail-soft skip + `orphanedDeltaPaths`; OpenBuilt change adds an admin surface for stale deltas.
- **Widget entries without `id` can't be delta-targeted** → `diffManifest` detects id-less mergeable arrays and emits a whole-array replace for them + a warning; correctness preserved, granularity degraded. Migration codemod can backfill ids.
- **Renderer/validator column disagreement** → single shared `resolveSlotColumns(slotName, slotColumns, propColumns)` helper used by both, so they cannot drift.
- **`$op`/`__order`/`id` collisions with real data** → `$op`/`__order` are reserved keys only meaningful inside a delta payload, never in a base manifest; validator rejects them in non-delta manifests.
- **ADR-036 is currently "Proposed"** → the amendment (Decision 2 per-page override, Decision 8 delta peer) rides alongside; this change references it and should not be archived before the ADR amendment lands.

## Migration Plan

1. Ship the schema `id` addition + utils + opt-in loader option + flexible columns — all additive, no consumer touch required.
2. Land the ADR-036 amendment in hydra (separate change) documenting the delta mode and per-page columns.
3. OpenBuilt change adopts `baseRef + delta` storage and server-side `mergeManifestDelta`.
4. Optional codemod backfills `widgetEntry.id` across fleet manifests to enable fine-grained deltas.

**Rollback:** Remove `mergeStrategy: 'delta'` call sites; the loaders revert to their existing default paths with no schema or data migration needed (the optional `id` is harmless if unused).

## Open Questions

- Should `mergeManifestDelta` also key `menu[]` by `menu.id` (it has one), or leave nav as replace-only for v1? (Lean: key it too, behind the same delta mode.)
- Where does the canonical merge run for OpenBuilt — server-side PHP port, or client-only with the server returning base+delta? (Deferred to the OpenBuilt change; this util is the contract either way.)
