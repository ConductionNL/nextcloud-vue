## 1. Schema — stable widget identity

- [ ] 1.1 Add optional `id` (string, kebab-case pattern) to `widgetEntry` in `src/schemas/app-manifest-v2.schema.json`, keeping `additionalProperties: false` by listing `id` explicitly.
- [ ] 1.2 In `src/utils/validateManifest.js`, reject the reserved keys `$op` and `__order` when they appear in a non-delta manifest (with an error naming the key).
- [ ] 1.3 Add fixtures: a v2 manifest with widget ids, one without, and one illegally containing `$op`/`__order`.

## 2. Delta-merge utilities (pure, Vue-free)

- [ ] 2.1 Create `src/utils/mergeManifestDelta.js` — keyed structural merge: objects recurse; `pages[]` keyed by `page.id`, `widgets[]` keyed by `widget.id`; new keys append; id-less arrays replace wholesale.
- [ ] 2.2 Implement `$op: "remove"` deletion and optional `__order: [...ids]` reordering (unlisted entries retained after listed ones).
- [ ] 2.3 Skip orphaned patches (key matches nothing in base), `console.warn`, and return collected `orphanedDeltaPaths`.
- [ ] 2.4 Create `src/utils/diffManifest.js` — minimal keyed delta such that `mergeManifestDelta(base, diffManifest(base, edited))` deep-equals `edited`; emit `$op:"remove"` for dropped keyed entries; whole-array replace + warn for id-less mergeable arrays.
- [ ] 2.5 Add a shared `resolveSlotColumns(slotName, slotColumns, propColumns)` helper in `src/utils/` (used by both renderer and validator in §4).
- [ ] 2.6 Export `mergeManifestDelta`, `diffManifest`, `resolveSlotColumns` from `src/index.js` barrel.
- [ ] 2.7 Unit tests: patch existing page, append widget, remove via `$op`, reorder via `__order`, orphan handling, diff round-trips (edit + removal), id-less fallback.

## 3. Opt-in delta mode in the loaders

- [ ] 3.1 `useAppManifest`: add `options.mergeStrategy`; when `'delta'`, apply `mergeManifestDelta(bundled, fetched)` instead of `deepMerge`; otherwise unchanged.
- [ ] 3.2 `useRuntimeManifest`: add `options.mergeStrategy`; when `'delta'`, apply `mergeManifestDelta(stub, fetched)` instead of full replace; otherwise unchanged.
- [ ] 3.3 Both loaders return an `orphanedDeltaPaths` ref (parallel to `unresolvedSentinels`); default `[]`.
- [ ] 3.4 Tests: delta mode merges against base; default mode behaviour byte-for-byte unchanged for both loaders.

## 4. Flexible per-slot columns

- [ ] 4.1 `CnWidgetGrid`: add `columns` prop (Number, default `null`); resolve via `resolveSlotColumns(slotName, injected slotColumns, columns)`; keep `SLOT_COLUMNS` default.
- [ ] 4.2 `CnPageRenderer` / `CnDetailPage`: read `page.config.slotColumns` and pass it to `CnWidgetGrid` (prop or provide).
- [ ] 4.3 Update the `gridLayout` mixin to compute `widgetGridStyle` spans against a resolved column count (default 12).
- [ ] 4.4 `validateManifest`: enforce `gridX + gridWidth ≤ resolvedColumns` using `resolveSlotColumns`; error message names widget, slot, and bound.
- [ ] 4.5 Add `slotColumns` to the page `config` in the v2 schema (optional object: slot → integer).
- [ ] 4.6 Tests: default 12 unchanged; `slotColumns` override; prop overrides both; validator passes/fails at the resolved bound.

## 5. Docs & barrels

- [ ] 5.1 Document `mergeManifestDelta`, `diffManifest`, `resolveSlotColumns` under `docs/utilities/`; pass `npm run check:docs`.
- [ ] 5.2 Update `CnWidgetGrid` JSDoc + `docs/components/` for the `columns` prop; regenerate `_generated` partials; pass `check:jsdoc`.
- [ ] 5.3 Document the `mergeStrategy: 'delta'` option + `orphanedDeltaPaths` on the `useAppManifest`/`useRuntimeManifest` composable docs.

## 6. Verification

- [ ] 6.1 `npm test` green (new utils + loader + grid tests).
- [ ] 6.2 `npm run check:docs` and `npm run check:jsdoc` pass at or above baseline.
- [ ] 6.3 Sanity-build one consumer manifest (e.g. pipelinq) unchanged to confirm zero behavioural drift in default mode.

## 7. Cross-repo follow-ups (tracked, not in this change)

- [ ] 7.1 hydra: amend ADR-036 — Decision 2 (per-page `slotColumns` override) and Decision 8 (delta mode as a peer of replace).
- [ ] 7.2 openbuild: separate change to store `baseRef + manifestDelta` and resolve via `mergeManifestDelta` (server-side and/or editor live-preview).
- [ ] 7.3 Optional fleet codemod to backfill `widgetEntry.id` for fine-grained deltas.
