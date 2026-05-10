# Tasks: Manifest dynamic per-tenant menu entries

## Phase 1 — Spec

- [ ] Write `specs/manifest-dynamic-menu/spec.md` with the
      backend-merge requirements: menu-array replacement semantic,
      schema-conformance requirement, bundled-fallback expectation,
      i18n key requirement.
- [ ] Cross-reference ADR-024 (lib v2 backlog rows: "Dynamic
      per-tenant menu entries", "Backend `/api/manifest` endpoint
      implementation") and ADR-022 (apps consume OR abstractions).

## Phase 2 — Tests

- [ ] Add a `useAppManifest.spec.js` fixture test that simulates a
      backend manifest response with a fully-resolved `menu[]`
      (one bundled placeholder entry expanded into N children) and
      asserts the merged manifest carries the resolved list.
- [ ] Add a fixture test that asserts the bundled `menu[]`
      survives unchanged when the backend returns 404.
- [ ] Add a fixture test that asserts a malformed backend `menu[]`
      (e.g. missing `id`) fails validation, the bundled manifest
      stays in place, and `validationErrors` is populated.

## Phase 3 — Documentation

- [ ] Extend `docs/utilities/composables/use-app-manifest.md` with a
      "Dynamic per-tenant menu entries" section: backend response
      shape, array-replace semantic, bundled-fallback, worked
      example with a catalogue fan-out.
- [ ] Extend `docs/migrating-to-manifest.md` with a "Dynamic menu
      entries" subsection and link to the composable docs.
- [ ] Add a one-line cross-reference in `docs/components/cn-app-nav.md`
      noting that the menu rendered is whatever `useAppManifest`
      resolves to, with a link to the dynamic-menu pattern.

## Phase 4 — Lock

- [ ] Run `npm test` — all green (existing + new fixture tests).
- [ ] Run `npm run check:docs` — no missing-doc errors.
- [ ] Run `npm run check:jsdoc` — JSDoc coverage unchanged or
      improved (this change adds no new public exports, so the
      ratchet should stay at baseline).
