# Tasks: Manifest detail lifecycle actions

## Phase 1 — CnLifecycleActions component

- [x] Create `src/components/CnLifecycleActions/CnLifecycleActions.vue`
      with `objectId`, `object`, `config` props and `transitioned` /
      `reload` events.
- [x] Server-derived mode: fetch
      `/apps/openregister/api/objects/{id}/available-actions` and render a
      button per action (description-or-title-cased label). (REQ-MDLA-2)
- [x] Config-declared mode: filter an explicit `transitions` array by the
      object's current lifecycle value; missing `from` = any state.
      (REQ-MDLA-3)
- [x] Apply: POST `{ action }` to `/transition`, emit `transitioned` +
      `reload`, re-fetch actions in server mode. (REQ-MDLA-4)
- [x] Surface a 403/422 `{ error }` rejection inline; suppress `reload`.
      (REQ-MDLA-5)
- [x] `src/components/CnLifecycleActions/index.js` re-export.

## Phase 2 — CnDetailPage wiring

- [x] Add `lifecycleActions` prop (Object, default `null`). (REQ-MDLA-1)
- [x] Render `CnLifecycleActions` in the header actions row when set and an
      object id / loaded object is present.
- [x] Re-fetch the object on the child's `reload` event; re-emit
      `transitioned`. (REQ-MDLA-4)
- [x] Confirm `config.lifecycleActions` flows through CnPageRenderer (no
      renderer change needed — config spreads as props).

## Phase 3 — Barrels, tests, docs

- [x] Export `CnLifecycleActions` from `src/components/index.js` and
      `src/index.js`.
- [x] Unit tests: `tests/components/CnLifecycleActions.spec.js` (server +
      config modes, apply, reject) and
      `tests/components/CnDetailPageLifecycleActions.spec.js` (wiring +
      reload + re-emit).
- [x] Docs: `docs/components/cn-lifecycle-actions.md`; add the prop +
      `transitioned` event to `docs/components/cn-detail-page.md` and
      `src/components/CnDetailPage/CnDetailPage.md`.
- [x] `npm run check:docs`, `npm run check:jsdoc`, lint clean on changed
      src; full jest suite green.
