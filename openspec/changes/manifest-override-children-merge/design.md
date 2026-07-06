# Design

## Context

Runtime manifest override is an existing, shipped nc-vue capability (ADR-024 / ADR-036): `useAppManifest` fetches `GET /apps/{appId}/api/manifest` and merges it over the bundled manifest, either by `deepMerge` (arrays replace) or the opt-in `delta` strategy (`mergeManifestDelta`, keyed by id). The `delta` keyed set was `pages` / `widgets` / `menu` — a menu entry's nested `children[]` was not keyed, so it replaced wholesale.

## Decisions

### D1 — Add `children` to `KEYED_ARRAYS` (single source of truth)

`KEYED_ARRAYS` in `mergeManifestDelta.js` is imported by `diffManifest.js`, so extending it there makes both the merge and the diff treat nested children identically. `mergeKeyedArray` already recurses into matched entries via `mergeValue`, so nested children keyed-merge with **no** change to the recursion — only the constant grows by one entry (`children: 'id'`).

### D1b — Menu `query` for deep-linked filters (found end-to-end)

A per-record menu child must link to a *pre-filtered* index (`Cases?caseType=<uuid>`), which a route `name` alone can't express. Adding an optional `query` object to the `menuItem`/`menuItemLeaf` schema (kept `additionalProperties:false` otherwise) lets the entry carry router query params; `CnAppNav.itemTo()` folds them into `{ name, query }`. Critically, the schema addition is what lets a `query`-bearing **delta** pass validation — without it, `useAppManifest` discards the *entire* merged manifest for one unknown property, so no dynamic children render at all.

### D1c — Reactive default nav (the async override actually reaching the menu)

`CnAppRoot` rendered its default `<CnAppNav>` relying on the provided `cnManifest`. Vue 2 `inject` resolves a provided value **once** at the child's create time, so the getter-based provide froze the injected manifest at the bundled value; the async backend merge never updated the menu. Binding the (editor-aware) manifest as a **prop** (`:manifest="menuManifest"`) makes `CnAppNav.effectiveManifest` prefer the reactive prop over the frozen inject, so the menu re-renders when the override resolves. Deep descendants that still inject `cnManifest` are unaffected (menuManifest mirrors the same getter). Verified end-to-end in procest: the "Cases" group grows from 2 to 20 children after the backend delta lands, with no reload.

### D2 — Why keyed children can't regress the manifest editor

The concern with keying children is the diff/merge round-trip used by OpenBuilt's editor (`useRuntimeManifest` delta mode). Because `diffManifest` reads the same `KEYED_ARRAYS`, a removed child now yields a `{ id, $op: 'remove' }` marker (not a shorter replacement array), and the merge applies it — so removals still round-trip exactly. Additions/patches emit minimal per-child deltas. No existing test asserted children-replace, confirming nothing depended on the old behaviour.

### D3 — Collision safety of the bare `children` key

`KEYED_ARRAYS` keys by array **property name** regardless of parent. `children` appears only on menu entries in the manifest schema (`app-manifest.schema.json` / `app-manifest-v2.schema.json`), where every entry has an `id`. No `pages[]`/`widgets[]` structure uses a literal `children[]` array, so keying `children` cannot mis-key an unrelated array. (The wiki sidebar's `childField: 'children'` is a runtime data-tree config value, not a manifest array — unaffected.)

### D4 — Promote to a fleet-wide feature doc

Runtime override was documented piecemeal across `use-app-manifest.md`, `merge-manifest-delta.md`, and `migrating-to-manifest.md`, and `use-app-manifest.md` incorrectly implied `menu[]` is always replaced wholesale (true only for `deepMerge`). A dedicated `docs/manifest-runtime-override.md` now owns the contract, both merge strategies, security, and the per-case-type worked example; the other pages correct their claims and cross-link to it.

## Declarative-vs-imperative decision (ADR-031)

N/A — this is a pure frontend utility + docs change. No OpenRegister schema, lifecycle, aggregation, or notification behaviour is introduced or modified.

## Risks

- **Delta-mode consumers relying on children-replace** — mitigated: no such test/consumer found; diff/merge symmetry preserved; `deepMerge` (the default, used by most apps) is untouched.
