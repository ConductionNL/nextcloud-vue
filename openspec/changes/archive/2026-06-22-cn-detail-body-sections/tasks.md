# Tasks: CnDetailPage In-Body Sections

## Phase 1 — CnBodySections component

- [x] Add `src/components/CnBodySections/CnBodySections.vue` — resolves each
      section's `component` from `cnRegistry` then `cnCustomComponents`,
      token-resolves `props` via `resolveFilterValue`, `provide`s
      `cnSectionContext`, filters by `placement`, lays out by `colSpan`, and
      renders an inline error for unresolved components.
      (spec_ref: cn-detail-body-sections §1, §2, §3, §5)
- [x] Add `src/components/CnBodySections/CnSectionBoundary.js` — per-section
      `errorCaptured` boundary rendering an inline error card on throw.
      (spec_ref: cn-detail-body-sections §4)
- [x] Add `src/components/CnBodySections/index.js` barrel.
- [x] Export `CnBodySections` from `src/components/index.js` and `src/index.js`.

## Phase 2 — CnDetailPage wiring

- [x] Add the `bodyWidgets` prop (default `[]`) to `CnDetailPage.vue` with a
      rich JSDoc docblock. (spec_ref: cn-detail-body-sections §6)
- [x] Add `hasBodyWidgets`, `endPlacementSections`, and `sectionContext`
      computeds; mount `CnBodySections` at the four placement points
      (`before-body` / `after-data` / `after-related` / `end`).
      (spec_ref: cn-detail-body-sections §6, §7)

## Phase 3 — registry kind

- [x] Add the `section` kind (no required metadata) to
      `REGISTRY_KIND_REQUIRED_FIELDS` in `CnAppRoot.vue` so a body-section
      component can be registered without grid metadata or sidebar-tab parity.
      (spec_ref: cn-detail-body-sections §8)

## Phase 4 — tests + docs

- [x] `tests/components/CnDetailPageBodyWidgets.spec.js` — registered-component
      render, token-resolved props (`@objectId` / `@object.field`), dropped
      optional/unresolved tokens, injectable `cnSectionContext`, placement
      ordering, end-placement default, throwing-section inline degradation,
      unresolved-component inline error, no-sidebar-tab.
- [x] `docs/components/cn-body-sections.md` + `bodyWidgets` row in
      `docs/components/cn-detail-page.md` + the `src/components/CnDetailPage/CnDetailPage.md`
      styleguide table; regenerate `_generated` partials.
- [x] `npm test` green (full suite), `npm run check:docs`, `npm run check:jsdoc`,
      eslint clean on changed files.
