# Proposal: add-features-roadmap-menu

## Summary

Ship the frontend half of the cross-repo `add-features-roadmap-menu` change: a shared Vue 2.7 component family exported from `@conduction/nextcloud-vue` that lets any Conduction app mount a Features & Roadmap surface inside `NcAppNavigationSettings`. The backend (GitHub Issues proxy on OpenRegister) ships separately under the same change name in the `openregister` repo.

## Motivation

OpenRegister now exposes `GET/POST /index.php/apps/openregister/api/github/issues` (see `openregister/openspec/changes/add-features-roadmap-menu/specs/github-issue-proxy/spec.md`). With the API in place, every Conduction app needs a consistent way to surface roadmap items and capture user-generated feature requests without each app re-rolling Vue components. The shared library is the right home — it already exports `CnSettingsCard` / `CnSettingsSection`, this adds the first "cross-app navigation surface" component family.

## Affected Projects

- [ ] Project: `nextcloud-vue` — six new Vue components + one composable + two exported constants + i18n strings + peer-dep additions (`marked`, `dompurify`); updated `src/index.js` barrel
- [ ] Project: `openregister` — runtime dependency only (the API the components call); no code change required here for nc-vue's side of this change

## Scope

### In Scope

- `CnFeaturesAndRoadmapLink.vue` — `NcAppNavigationItem` that navigates to the route configured by the host app
- `CnFeaturesAndRoadmapView.vue` — route-level view with Features + Roadmap tabs + Suggest header button
- `CnFeaturesTab.vue` — alphabetical list driven by a `features` prop (built-time JSON from `@conduction/openspec-manifest`)
- `CnRoadmapTab.vue` — reaction-sorted list fetched from `/api/github/issues?labels=enhancement,feature`
- `CnRoadmapItem.vue` — single roadmap card with sanitized markdown body + filtered label chips
- `CnSuggestFeatureModal.vue` — title + body submission form with live markdown preview
- `useSpecRef()` composable — reads kebab-case slug from `$options.specRef` / route `meta.specRef`
- `useSuggestFeatureAction()` helper — returns `NcActions` item for context-aware suggestion
- `SAFE_MARKDOWN_DOMPURIFY_CONFIG` constant — strict allowlist reused by item + preview
- `ROADMAP_LABEL_BLOCKLIST` constant — 20 regex patterns hiding hydra pipeline labels (per D16)
- i18n keys added to `l10n/en.json` + `l10n/nl.json` (route title, tab labels, empty states, modal labels, toasts, validation messages)
- `marked` and `dompurify` wired as peer dependencies in `package.json`
- Public-API exports added to `src/components/index.js` + `src/index.js`
- Per-component documentation under `docs/components/` (kebab-case filenames) regenerated via JSDoc + `prebuild:docs`

### Out of Scope

- The GitHub Issues proxy backend (lives in `openregister` under the same openspec change name)
- The `@conduction/openspec-manifest` build CLI (separate package; section 3 of the openregister tasks.md)
- The `@conduction/docusaurus-features` package (separate; section 4)
- App-level adoption — each consuming app mounts the components themselves under a separate per-app change
- Storybook stories — the library doesn't use Storybook; visual review happens via the existing JSDoc-driven docusaurus site
- Visual snapshot tests — no visual-snapshot infra exists in this repo today

## Approach

Each component lives in its own directory under `src/components/CnXxx/` with an `index.js` barrel — matching the existing convention used by `CnFormDialog`, `CnDeleteDialog`, `CnSettingsSection`, etc. The composable and constants ship from `src/composables/` and `src/utils/` respectively. All HTTP calls use `axios` + `@nextcloud/router`'s `generateUrl`. All user-visible strings wrap with `t('nextcloud-vue', '...')` and resolve from the library's existing l10n catalog registered in `src/l10n/index.js`. Body excerpts use `marked` → `DOMPurify` with the exported strict config — no `v-html` on raw user input.

Per ADR-004: Vue 2.7 Options API only. Per ADR-005: every API call URL-encodes path/query params. Per ADR-014: EUPL-1.2 SPDX header inside each `<script>` block. Per the library's `check:docs` + `check:jsdoc` gates: 100% JSDoc coverage on every prop / event / slot of new components.

## Cross-Project Dependencies

- **Depends on (runtime):** `openregister`'s `github-issue-proxy` capability — the GET endpoint for roadmap reads + POST for submissions. Both ship under the openregister portion of this change. The components degrade gracefully if OR's API is absent (404 → "not configured", network error → retry).
- **Depends on (build):** `@conduction/openspec-manifest` (section 3) emits `docs/features.json` consumed by `CnFeaturesTab`. Until that package ships, `CnFeaturesTab` accepts the features array as a prop and apps can hand-feed it.
- **No build-time dependency on `openregister`** — this library ships independently; apps that don't have OpenRegister installed will see the "not configured" state on the Roadmap tab while the Features tab keeps working.

## Rollback Strategy

- The six components + composable + constants are new exports only. Removing them from `src/components/index.js` + `src/index.js` and deleting the new directories restores the previous state.
- Removing the `marked` + `dompurify` peer-dep additions from `package.json` and reverting `l10n/*.json` to drop new keys completes the rollback.
- Semver: minor bump (new exports, no breaking changes). No DB, no schemas.

## Open Questions

_(none — design follows the openregister spec's section 2, decisions D7, D12, D15, D16, D18 already locked)_
