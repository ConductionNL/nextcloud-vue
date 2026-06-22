## Why

OpenBuilt stores each built app as a **whole-manifest blob** and `useAppManifest` deep-merges it over the bundled manifest with **array-replace** semantics. Two consequences fall out of this: (1) a built app cannot inherit later upgrades to its base app — every base bugfix or new page is frozen out the moment the blob is saved; and (2) a backend manifest that wants to patch a single page must re-send the *complete* `pages[]` array, because partial arrays silently drop the rest. The root cause is that v2 widget entries have **no stable identity** (`widgetEntry` is `additionalProperties:false` with no `id`), so the merge cannot match "the same widget" across base and override and falls back to replacing the array wholesale.

Separately, ADR-036 Decision 2 fixes per-slot grid columns in a hard-coded table (`body`=12, `sidebar`=1) inside `CnWidgetGrid`. Apps that want an 8-column body or a 2-column sidebar have no seam short of dropping to a `type:"custom"` page — defeating the manifest model.

This change builds the **shared foundation** both problems need: a stable widget identity, a keyed delta-merge engine, and flexible per-slot columns. A separate OpenBuilt change will consume it to store `baseRef + delta` instead of a blob.

## What Changes

- **Add an optional `id` to the v2 `widgetEntry` schema** (string, kebab-case). Existing manifests without it stay valid; `id` becomes the merge key. Keep `additionalProperties:false` by adding `id` explicitly.
- **New util `mergeManifestDelta(base, delta)`** — keyed structural merge: plain objects recurse; `pages[]` merge by `page.id` and `widgets[]` merge by `widget.id`; a `{ "$op": "remove" }` marker deletes a keyed entry; an optional `__order: [...ids]` reorders. Patches that target a missing base entry are **skipped** and surfaced on an `orphanedDeltaPaths` ref (mirrors the existing `unresolvedSentinels` pattern).
- **New util `diffManifest(base, edited)`** — produces the minimal keyed delta that `mergeManifestDelta` consumes (the value OpenBuilt's editor will persist).
- **New opt-in `'delta'` merge mode** in `useAppManifest` / `useRuntimeManifest` (`options.mergeStrategy: 'delta'` + a base source). The existing v1 deep-merge default and v2 full-replace (`useRuntimeManifest`) paths are **unchanged** — no current consumer behaviour shifts.
- **Flexible per-slot columns** — `CnWidgetGrid` gains a `columns` prop (Number, default `null` → falls back to the existing `SLOT_COLUMNS`/`getGridColumns(slotName)`); manifests may set `page.config.slotColumns: { body: 8 }`; `CnPageRenderer`/`CnDetailPage` resolve and pass it down. `validateManifest` checks `gridX + gridWidth ≤ resolvedColumns` instead of a hard-coded `12`.
- **No BREAKING changes.** Every new prop/option/field defaults to today's behaviour. Requires a companion **ADR-036 amendment** (Decision 2 → per-page override allowed; Decision 8 → delta mode added as a peer of replace) — tracked in hydra, referenced here.

## Capabilities

### New Capabilities

- **manifest-delta-merge** — `mergeManifestDelta`, `diffManifest`, the stable widget `id`, the `$op`/`__order` markers, orphaned-patch surfacing, and the opt-in `'delta'` merge mode in the manifest loaders.

### Modified Capabilities

- **grid-widget-system** — `CnWidgetGrid` gains the `columns` prop and `slotColumns` resolution; the validator's column bound becomes `resolvedColumns`. (Spec lives at `openspec/specs/grid-widget-system/spec.md`.)

## Impact

- **Code:** `src/utils/` (new `mergeManifestDelta.js`, `diffManifest.js`), `src/composables/useAppManifest.js` + `useRuntimeManifest.js` (opt-in delta path), `src/components/CnWidgetGrid/CnWidgetGrid.vue` (`columns` prop), `src/components/CnPageRenderer` + `CnDetailPage` (resolve & pass `slotColumns`), `src/utils/validateManifest.js` (resolvedColumns bound), `src/schemas/app-manifest-v2.schema.json` (optional `id` on `widgetEntry`).
- **Consumers:** All five (OpenRegister, OpenCatalogi, Procest, Pipelinq, MyDash) — but only via additive, default-off options; no consumer requires changes. The downstream beneficiary is **OpenBuilt** (separate change).
- **Theming:** None — no new colors or CSS variables; flexible columns reuse existing `--cn-grid-*` custom properties.
- **Cross-repo:** ADR-036 amendment (hydra) is a prerequisite for accepting the spec; this change references it.
