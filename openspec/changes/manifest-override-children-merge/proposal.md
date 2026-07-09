---
kind: code
---

# Runtime manifest override: keyed menu children, deep-link query, reactive nav

## Why

`@conduction/nextcloud-vue` already lets any manifest app override its own shell at runtime: `useAppManifest(appId, bundled)` fetches `GET /apps/{appId}/api/manifest` and merges it over the bundled manifest. The opt-in `delta` strategy (`mergeManifestDelta`) merges the identity-bearing arrays `pages[]`, `widgets[]`, and `menu[]` **by `id`** so a backend sends only the difference.

But the end-to-end "one nav entry per record" pattern (e.g. one entry per case type under a "Cases" group, resolved by the app's backend) hit **three** gaps, all found while wiring procest's per-case-type menu:

1. **Nested `children[]` were not keyed** — a delta patching a group's children fell through to "replace non-keyed arrays wholesale", **erasing** the group's existing children (the leaves `buildManifest` relocated there).
2. **Menu items had no `query`** — a child could only point at a route `name`, so it couldn't deep-link to a *pre-filtered* index page (`Cases?caseType=<uuid>`). The schema rejected `query` (`additionalProperties:false`), so any delta carrying it failed validation and was discarded wholesale.
3. **The default nav was not reactive to the async override** — `CnAppRoot` rendered its default `<CnAppNav>` relying on the non-reactive Vue 2 provide/inject `cnManifest`, which resolves **once** at child-create time. So the async backend merge never reached the menu; the nav stayed on the bundled manifest.

This change closes all three, making the runtime manifest-override feature actually deliver a live, per-record menu, and promotes it to a first-class fleet-wide documented feature.

## What changes

- `src/utils/mergeManifestDelta.js` — add `children: 'id'` to `KEYED_ARRAYS`. Because `mergeKeyedArray` already recurses into matched entries, nested children now merge by id (patch matching, append new, `$op:'remove'` to delete) instead of replacing wholesale.
- `src/utils/diffManifest.js` — inherits the same `KEYED_ARRAYS`, so `diff → merge` round-trips stay symmetric for children (minimal per-child delta, `$op:'remove'` for dropped children). Docstring updated.
- `src/schemas/app-manifest-v2.schema.json` — add an optional `query` (object of string/number/boolean) to both `menuItem` and `menuItemLeaf`, so a nav entry can carry vue-router query params (e.g. `{ caseType }`) without failing `additionalProperties:false`. Compiled validator regenerated.
- `src/components/CnAppNav/CnAppNav.vue` — `itemTo()` folds `item.query` into the router target (`{ name, query }`) so entries deep-link to a pre-filtered index; absent `query` is unchanged.
- `src/components/CnAppRoot/CnAppRoot.vue` — a new `menuManifest` computed (editor-aware, mirroring the `cnManifest` provide getter) is bound as a **prop** on the default `<CnAppNav :manifest="menuManifest">`. Prop precedence over the frozen inject makes the menu update reactively when the async override resolves.
- `src/components/CnObjectSidebar/CnObjectSidebar.vue` — add an `'audit-trail'` alias to the sidebar's `BUILTIN_WIDGETS` (→ `CnAuditTrailTab`, alongside the existing `audit`), so a manifest can declare a change-log **sidebar tab** with `widgets: [{ type: 'audit-trail' }]` — the same widget key it uses for the detail-page body widget. This is what lets procest surface "Change history" as a case-detail sidebar tab.
- Tests — `mergeManifestDelta.spec.js` / `diffManifest.spec.js` (add/patch/remove children + round-trip); `CnAppNav.spec.js` (itemTo query folding + per-child link); `CnAppRoot.spec.js` (default CnAppNav gets manifest as a reactive prop that tracks changes).
- Docs — a new fleet-wide feature page `docs/manifest-runtime-override.md`, plus corrections/cross-links in `use-app-manifest.md`, `merge-manifest-delta.md`, `cn-app-nav.md`, `cn-app-root.md`, `cn-data-table.md`, and `migrating-to-manifest.md`.

## Impact

Backward compatible. `deepMerge` mode (default) is untouched — arrays still replace. The `query` field and `menuManifest` prop are additive/optional; groups/apps that don't use them behave exactly as before. Only `delta`-mode consumers change for nested `children[]`; no existing test pinned the old children-replace behaviour, and the diff/merge round-trip is symmetric by construction. Together these enable procest's live per-case-type menu (change `case-type-navigation`, verified end-to-end in the browser) and any future per-record menu fan-out fleet-wide.

## Capabilities

### Modified Capabilities
- `manifest-delta-merge` — the keyed set now includes a menu entry's nested `children[]`.
- `manifest-runtime-override` — menu entries carry optional `query` for deep-linked filters; the default `CnAppNav` receives the manifest as a reactive prop so async overrides render live.
