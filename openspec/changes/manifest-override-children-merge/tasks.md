## 1. Merge + diff engine

- [x] 1.1 Add `children: 'id'` to `KEYED_ARRAYS` in `src/utils/mergeManifestDelta.js` and update its module docstring.
- [x] 1.2 Update the `diffManifest.js` module docstring to note nested `children` diff by id (it already reads `KEYED_ARRAYS`, so no logic change).

## 2. Menu-item query (deep-linked filters)

- [x] 2.1a Add optional `query` (object of string/number/boolean) to `menuItem` + `menuItemLeaf` in `src/schemas/app-manifest-v2.schema.json`; regenerate the compiled validator.
- [x] 2.2a `CnAppNav.itemTo()` folds `item.query` into the router target (`{ name, query }`); absent query unchanged; action/href items still return null.

## 3. Reactive default nav

- [x] 3.1a Add a `menuManifest` computed to `CnAppRoot` (editor-aware) and bind it as `:manifest` on the default `<CnAppNav>` so the async override renders live (bypasses the frozen provide/inject).

## 4. Tests

- [x] 4.1a `tests/utils/mergeManifestDelta.spec.js` — `nested menu children` describe: add-children-preserves-existing, patch-child-leaves-siblings, remove-child-via-$op.
- [x] 4.2a `tests/utils/diffManifest.spec.js` — `nested menu children` describe: minimal per-child add delta round-trips; removal emits `$op:'remove'` and round-trips.
- [x] 4.3a `tests/components/CnAppNav.spec.js` — `menu-item query params` describe: itemTo folds query; omits when absent; null for action/href; per-child link carries query.
- [x] 4.4a `tests/components/CnAppRoot.spec.js` — `reactive menu manifest` describe: default CnAppNav gets manifest as a prop; the prop updates when the manifest prop changes.

## 5. Sidebar audit-trail tab

- [x] 5.1a Add `'audit-trail'` alias to `BUILTIN_WIDGETS` in `CnObjectSidebar.vue` (→ CnAuditTrailTab) so a manifest sidebar tab can render the change log via `widgets: [{ type: 'audit-trail' }]`.
- [x] 5.2a `tests/components/CnObjectSidebar.spec.js` — assert `type:'audit-trail'` resolves to CnAuditTrailTab.

## 3. Documentation (fleet-wide feature)

- [x] 3.1 Write `docs/manifest-runtime-override.md` — the authoritative feature page: endpoint contract, `deepMerge` vs `delta` strategies, keyed children, security, per-case-type worked example, ADR links.
- [x] 3.2 Correct `docs/utilities/composables/use-app-manifest.md` (two merge modes; stop claiming `menu[]` always replaces) and cross-link the feature page.
- [x] 3.3 Update `docs/utilities/merge-manifest-delta.md`, `docs/components/cn-app-nav.md`, and `docs/migrating-to-manifest.md` to mention keyed `children[]` and link the feature page.
- [x] 3.4 Fix the pre-existing `hideHeader` doc gap in `docs/components/cn-data-table.md` (unblocks `check:docs`).

## 4. Verify

- [x] 4.1 `npm test` — full suite green (362 suites / 3838 tests).
- [x] 4.2 `npm run check:docs` — passes (after the `hideHeader` fix).
- [x] 4.3 `npm run build` — dist builds clean (pre-existing warnings only).

## Acceptance Criteria

- A backend `/api/manifest` delta can add, patch, and remove individual children of a menu group without clobbering the group's other children.
- `diff → merge` round-trips remain exact for nested children (removals via `$op:'remove'`).
- `deepMerge` mode and all non-children delta behaviour are unchanged.
- The runtime manifest-override feature has one authoritative, cross-linked documentation page.

## Quality Checklist

- No breaking change to existing prop/merge interfaces; `KEYED_ARRAYS` grows additively.
- Merge and diff share one `KEYED_ARRAYS` source of truth (symmetry by construction).
- New tests cover add/patch/remove for both merge and diff.
- Docs coverage (`check:docs`) green.
