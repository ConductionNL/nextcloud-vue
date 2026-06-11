# Tasks: Manifest dynamic per-tenant menu entries

## Phase 1 — Spec

- [x] Write `specs/manifest-dynamic-menu/spec.md` with the
      backend-merge requirements: menu-array replacement semantic,
      schema-conformance requirement, bundled-fallback expectation,
      i18n key requirement.
- [x] Cross-reference ADR-024 (lib v2 backlog rows: "Dynamic
      per-tenant menu entries", "Backend `/api/manifest` endpoint
      implementation") and ADR-022 (apps consume OR abstractions).

## Phase 2 — Tests

- [x] Add a `useAppManifest.spec.js` fixture test that simulates a
      backend manifest response with a fully-resolved `menu[]`
      (one bundled placeholder entry expanded into N children) and
      asserts the merged manifest carries the resolved list.
- [x] Add a fixture test that asserts the bundled `menu[]`
      survives unchanged when the backend returns 404.
- [x] Add a fixture test that asserts a malformed backend `menu[]`
      (e.g. missing `id`) fails validation, the bundled manifest
      stays in place, and `validationErrors` is populated.

## Phase 3 — Documentation

- [x] Extend `docs/utilities/composables/use-app-manifest.md` with a
      "Dynamic per-tenant menu entries" section: backend response
      shape, array-replace semantic, bundled-fallback, worked
      example with a catalogue fan-out.
- [x] Extend `docs/migrating-to-manifest.md` with a "Dynamic menu
      entries" subsection and link to the composable docs — already
      present at `docs/migrating-to-manifest.md#dynamic-per-tenant-menu-entries`
      (line 96) with the deep-merge replace semantics and a backend
      contract pointer.
- [x] Add a one-line cross-reference in `docs/components/cn-app-nav.md`
      noting that the menu rendered is whatever `useAppManifest`
      resolves to, with a link to the dynamic-menu pattern — already
      present at `docs/components/cn-app-nav.md` line 218 (`## Dynamic
      per-tenant menu entries`).

## Phase 4 — Lock

- [x] Run `npm test` — all green (existing + new fixture tests).
- [x] Run `npm run check:docs` — no missing-doc errors. Re-run in
      nv-final batch: all 218 public exports documented, all 127 component
      docs cover their props and slots.
- [x] Run `npm run check:jsdoc` — JSDoc coverage unchanged or
      improved. Re-run in nv-final batch: all 147 components meet
      baseline; no ratchet change.
