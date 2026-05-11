# Design: add-features-roadmap-menu (nextcloud-vue half)

## Architecture Overview

Six Vue 2.7 components + one composable + one action helper + two exported constants, all shipped from `@conduction/nextcloud-vue`. No new Pinia store — each component owns its own transient state (loading, modal visibility, fetched items). Talks to OpenRegister's `github-issue-proxy` API via `axios`; no GitHub calls from the browser.

```
Consuming app's <NcAppNavigationSettings>
  └── <CnFeaturesAndRoadmapLink/>                 (src/components/CnFeaturesAndRoadmapLink/)
        navigates to:
  /features-roadmap
    └── <CnFeaturesAndRoadmapView/>                 (src/components/CnFeaturesAndRoadmapView/)
          ├── <CnFeaturesTab/>                        (src/components/CnFeaturesTab/)
          ├── <CnRoadmapTab/>                         (src/components/CnRoadmapTab/)
          │     └── <CnRoadmapItem/>                    (src/components/CnRoadmapItem/)
          └── <CnSuggestFeatureModal/>                  (src/components/CnSuggestFeatureModal/)
```

Exported support code:
- `src/composables/useSpecRef.js` — context-aware slug resolver
- `src/composables/useSuggestFeatureAction.js` — `NcActions` item factory
- `src/utils/safeMarkdownDompurifyConfig.js` — frozen `DOMPurify` config
- `src/utils/roadmapLabelBlocklist.js` — frozen array of 20 `RegExp` patterns

## Decisions

### D1 — Component directory convention

Every component lives in `src/components/<Name>/<Name>.vue` + `index.js` barrel + `docs/components/<kebab>.md` page. Matches the existing convention (`CnFormDialog`, `CnDeleteDialog`, `CnSettingsSection`). Modal isolation per hydra-gate-modal-isolation is satisfied: each modal has its own file under its own dir; no inline `<NcDialog>` markup inside a parent.

### D2 — i18n namespace `'nextcloud-vue'`

Strings wrap with `t('nextcloud-vue', '...')` and live in `l10n/en.json` + `l10n/nl.json`. Catalog is already registered in `src/l10n/index.js` under `APP_NAME = 'nextcloud-vue'`; consumer apps already call `registerTranslations()` in their `main.js`, so the new strings load wherever the components are mounted.

### D3 — axios + generateUrl, never fetch()

All HTTP calls use `axios` (existing peer dep) with paths built via `@nextcloud/router`'s `generateUrl('/apps/openregister/api/github/issues')`. ADR-005 mandates `encodeURIComponent` on any path/query value that comes from props or state.

### D4 — Plain markdown via marked + DOMPurify, never v-html on raw input

`CnRoadmapItem.vue` and `CnSuggestFeatureModal.vue`'s preview pane both pipe markdown through `marked()` → `DOMPurify.sanitize(html, SAFE_MARKDOWN_DOMPURIFY_CONFIG)` and then render via `v-html` on the sanitized HTML only. ADR-005 allows `v-html` on output that has been routed through a documented sanitizer.

### D5 — Strict DOMPurify config exported as a frozen constant

One config object lives in `src/utils/safeMarkdownDompurifyConfig.js`, frozen via `Object.freeze`, exported as `SAFE_MARKDOWN_DOMPURIFY_CONFIG`. Both consumers import the same constant — no inline overrides. Disallows `<script>`, all `on*` attributes, `javascript:` URLs, `<iframe>`, `<style>`. Future hardening (image-policy strip on external `src`) lands as a follow-up task; current skeleton keeps the config minimal.

### D6 — Label blocklist as a regex array constant

`ROADMAP_LABEL_BLOCKLIST` ships the 20 patterns from D16 in the openregister design. `CnRoadmapItem.vue` filters `item.labels` through `labels.filter(l => !ROADMAP_LABEL_BLOCKLIST.some(re => re.test(l.name)))` before rendering. Apps that want a different blocklist can fork the constant; the convention is shared.

### D7 — useSpecRef precedence: component option > route meta

Component-level `$options.specRef` / `defineOptions({specRef})` wins over Vue Router `route.meta.specRef`. Component-level is the stronger statement of intent (the widget itself declares it), route-level is the per-page fallback.

### D8 — Composable file extension `.js` (not `.ts`)

The library is JavaScript with JSDoc types — no TypeScript build step. `useSpecRef.js` and `useSuggestFeatureAction.js` follow suit.

## Component File Structure

```
src/
  components/
    CnFeaturesAndRoadmapLink/
      CnFeaturesAndRoadmapLink.vue
      index.js
    CnFeaturesAndRoadmapView/
      CnFeaturesAndRoadmapView.vue
      index.js
    CnFeaturesTab/
      CnFeaturesTab.vue
      index.js
    CnRoadmapTab/
      CnRoadmapTab.vue
      index.js
    CnRoadmapItem/
      CnRoadmapItem.vue
      index.js
    CnSuggestFeatureModal/
      CnSuggestFeatureModal.vue
      index.js
    index.js                         # add the six components
  composables/
    useSpecRef.js
    useSuggestFeatureAction.js
  utils/
    safeMarkdownDompurifyConfig.js
    roadmapLabelBlocklist.js
  l10n/
    index.js                         # (existing — registers 'nextcloud-vue' catalog)
  index.js                           # add 6 components + 2 composables + 2 constants

l10n/
  en.json                            # new translation keys
  nl.json                            # new translation keys (Dutch)

tests/
  components/
    CnFeaturesAndRoadmapLink.spec.js
    CnFeaturesAndRoadmapView.spec.js
    CnFeaturesTab.spec.js
    CnRoadmapTab.spec.js
    CnRoadmapItem.spec.js
    CnSuggestFeatureModal.spec.js
  composables/
    useSpecRef.spec.js
    useSuggestFeatureAction.spec.js
  utils/
    safeMarkdownDompurifyConfig.spec.js

docs/
  components/
    cn-features-and-roadmap-link.md
    features-and-roadmap-view.md
    features-tab.md
    roadmap-tab.md
    roadmap-item.md
    suggest-feature-modal.md
  utilities/
    composables/
      use-spec-ref.md
      use-suggest-feature-action.md
    safe-markdown-dompurify-config.md
    roadmap-label-blocklist.md
```

## API Consumed (not owned)

The components consume OpenRegister's API. Full contract: `openregister/openspec/changes/add-features-roadmap-menu/specs/github-issue-proxy/spec.md`. Summary for implementors:

| Method | Path | Consumer |
|---|---|---|
| GET | `/index.php/apps/openregister/api/github/issues?repo=<owner/repo>&labels=enhancement,feature` | `CnRoadmapTab.vue` |
| POST | `/index.php/apps/openregister/api/github/issues` | `CnSuggestFeatureModal.vue` |

`CnRoadmapTab` always sends `labels=enhancement,feature` (per D23 in openregister design). The `repo` parameter is passed in as a prop from the consuming app.

## Theming

All colors via Nextcloud CSS variables (`--color-primary`, `--color-text-light`, `--color-background-hover`, `--color-border`, `--color-warning-soft` for the stale notice). No hardcoded hex codes; no `--nldesign-*` references (nldesign overrides the NC variables automatically).

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| OpenRegister not installed → API 404 | `CnRoadmapTab` renders localized "not configured" empty state |
| API returns `hint: github_pat_not_configured` | Same empty state with admin-targeted message |
| GitHub rate-limited | Localized "temporarily unavailable" with reset time |
| Markdown XSS via issue body | Sanitized via `SAFE_MARKDOWN_DOMPURIFY_CONFIG`; Jest cases cover known vectors |
| Hydra labels leak through | Filtered through `ROADMAP_LABEL_BLOCKLIST` |
| `marked` / `dompurify` not installed on consumer | Peer-dep declaration documents the requirement; runtime error is clear |
| Existing JSDoc baselines bump | Update `scripts/.jsdoc-baselines.json` via `npm run jsdoc-baselines:update` after components ship at 100% coverage |
| `check:docs` failure on new exports | New per-component + per-utility `.md` pages land in the same PR |

## Migration Plan

1. Create six new component directories under `src/components/`, each with a `.vue` + `index.js` + `docs/components/<kebab>.md`.
2. Create `src/composables/useSpecRef.js`, `src/composables/useSuggestFeatureAction.js`.
3. Create `src/utils/safeMarkdownDompurifyConfig.js`, `src/utils/roadmapLabelBlocklist.js`.
4. Add new translation keys to `l10n/en.json` + `l10n/nl.json`.
5. Add `marked` + `dompurify` to `peerDependencies` in `package.json`.
6. Add Vitest specs under `tests/components/`, `tests/composables/`, `tests/utils/`.
7. Run `npm run prebuild:docs` to regenerate `docs/components/_generated/` JSDoc partials.
8. Run `npm run check:docs` + `npm run check:jsdoc` — both must pass.
9. Bump semver minor in `package.json`.
10. Open PR against `beta` (the nc-vue mainline integration branch).

## Open Questions

_(none — design follows openregister section 2 decisions)_
