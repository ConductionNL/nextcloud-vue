# Tasks: add-features-roadmap-menu (nextcloud-vue half)

## 1. Components — directory + barrel scaffold

- [x] 1.1 Create `src/components/CnFeaturesAndRoadmapLink/` directory with `CnFeaturesAndRoadmapLink.vue` + `index.js` barrel.
- [x] 1.2 Create `src/components/FeaturesAndRoadmapView/` directory with `FeaturesAndRoadmapView.vue` + `index.js` barrel.
- [x] 1.3 Create `src/components/FeaturesTab/` directory with `FeaturesTab.vue` + `index.js`.
- [x] 1.4 Create `src/components/RoadmapTab/` directory with `RoadmapTab.vue` + `index.js`.
- [x] 1.5 Create `src/components/RoadmapItem/` directory with `RoadmapItem.vue` + `index.js`.
- [x] 1.6 Create `src/components/SuggestFeatureModal/` directory with `SuggestFeatureModal.vue` + `index.js`.

## 2. Component implementations

- [x] 2.1 Implement `CnFeaturesAndRoadmapLink.vue` — props `routeName` (default `'features-roadmap'`), `disabled` (default `false`), `label` (default `t('nextcloud-vue', 'Features & roadmap')`). Renders `NcAppNavigationItem` with router-link. Returns nothing when `disabled === true`. EUPL-1.2 SPDX header. JSDoc on every prop.
- [x] 2.2 Implement `FeaturesAndRoadmapView.vue` — props `repo` (required), `features` (required Array), `disabled` (default `false`). Renders two-tab UI + header Suggest button. Hosts the `SuggestFeatureModal` via `v-if` toggle. EUPL-1.2 + JSDoc.
- [x] 2.3 Implement `FeaturesTab.vue` — prop `features` (Array). Alphabetical sort by `title` (locale-aware, case-insensitive). Each item shows title, summary, and a `docsUrl` link with `target="_blank" rel="noopener noreferrer"`. Empty state when array is `[]`. EUPL-1.2 + JSDoc.
- [x] 2.4 Implement `RoadmapTab.vue` — prop `repo` (required), `disabled` (default `false`). On `mounted`, fetches `GET /index.php/apps/openregister/api/github/issues?repo={repo}&labels=enhancement,feature` via `axios` + `generateUrl`. Handles success (renders `RoadmapItem` list sorted by `reactions.total_count` DESC), `hint: github_pat_not_configured`, `429 github_rate_limited`, and network error states. EUPL-1.2 + JSDoc.
- [x] 2.5 Implement `RoadmapItem.vue` — prop `item` (Object). Renders title, submitter avatar + login (NcAvatar), reaction count, relative time, markdown body via `marked` + `DOMPurify` (using exported `SAFE_MARKDOWN_DOMPURIFY_CONFIG`). Filters labels through `ROADMAP_LABEL_BLOCKLIST` before rendering chips. NO `v-html` on raw input. EUPL-1.2 + JSDoc.
- [x] 2.6 Implement `SuggestFeatureModal.vue` — props `repo` (required), `specRef` (default `null`). Renders NcDialog with NcTextField (title 3-200), NcTextArea (body ≥10), preview toggle, hidden specRef field. Submit POSTs to `/api/github/issues` with `{repo, title, body, specRef?}` + Nextcloud `requesttoken` header. Maps 201 → emit `submitted` + close, 429 → inline rate-limit message, other errors → inline generic message. EUPL-1.2 + JSDoc.

## 3. Composables + helpers

- [x] 3.1 Implement `src/composables/useSpecRef.js` — resolves slug from nearest ancestor `$options.specRef` / `defineOptions({specRef})` first, route `meta.specRef` fallback. Returns string or null. EUPL-1.2 + JSDoc.
- [x] 3.2 Implement `src/composables/useSuggestFeatureAction.js` — returns NcActions descriptor `{label, icon, action}` when `useSpecRef()` resolves a non-empty value, else `null`. Action callback opens `SuggestFeatureModal` with the slug pre-filled. EUPL-1.2 + JSDoc.

## 4. Constants

- [x] 4.1 Implement `src/utils/safeMarkdownDompurifyConfig.js` — exports `SAFE_MARKDOWN_DOMPURIFY_CONFIG` as `Object.freeze({...})`. Disallows `<script>`, `on*` attributes, `javascript:` URLs, `<iframe>`, `<style>`. EUPL-1.2 + JSDoc.
- [x] 4.2 Implement `src/utils/roadmapLabelBlocklist.js` — exports `ROADMAP_LABEL_BLOCKLIST` as a frozen array of 20 `RegExp` patterns per D16 in the openregister design. EUPL-1.2 + JSDoc.

## 5. i18n

- [x] 5.1 Add new translation keys to `l10n/en.json`: menu label "Features & roadmap"; route title; tab labels "Features", "Roadmap"; empty states (PAT-not-configured, rate-limited, network error, no features yet, admin-disabled); Suggest button label; modal title "Suggest a feature"; modal field labels (Title, Body, Preview); validation messages (title length, body length); Submit / Cancel; success toast; generic error toast.
- [x] 5.2 Add the same keys to `l10n/nl.json` with Dutch translations.
- [x] 5.3 Verify `src/l10n/index.js` already registers under `APP_NAME = 'nextcloud-vue'` (no change required — consumers call `registerTranslations()` from their `main.js`).

## 6. Public-API exports

- [x] 6.1 Add the six components to `src/components/index.js`.
- [x] 6.2 Add the six components + the two composables + the two constants to `src/index.js`.
- [ ] 6.3 Run `npm run check:docs` — every new named export has a matching `.md` under `docs/components/` or `docs/utilities/`.

## 7. Peer dependencies

- [ ] 7.1 Add `marked` (semver `^12.0.0`) and `dompurify` (semver `^3.0.0`) to `peerDependencies` in `package.json`.
- [ ] 7.2 Document in the README that consumer apps must install matching versions of `marked` and `dompurify`.

## 8. Tests

- [ ] 8.1 `tests/components/CnFeaturesAndRoadmapLink.spec.js` — default render, `disabled` returns null, custom route name.
- [ ] 8.2 `tests/components/FeaturesAndRoadmapView.spec.js` — both tabs rendered, Suggest opens modal, `disabled` shows admin empty state.
- [ ] 8.3 `tests/components/FeaturesTab.spec.js` — alphabetical sort, empty state, docsUrl gets noopener.
- [ ] 8.4 `tests/components/RoadmapTab.spec.js` — success path (mocked axios), PAT-not-configured hint, 429 rate-limited, network error retry. Verify the fetch URL contains `labels=enhancement,feature` exactly.
- [ ] 8.5 `tests/components/RoadmapItem.spec.js` — markdown sanitization (XSS vectors stripped), label blocklist filters hydra labels, reaction count rendered, avatar fallback.
- [ ] 8.6 `tests/components/SuggestFeatureModal.spec.js` — submit disabled for invalid input, 201 emits `submitted`, 429 inline error, CSRF token sent in header.
- [ ] 8.7 `tests/composables/useSpecRef.spec.js` — component option wins, route meta fallback, both absent returns null.
- [ ] 8.8 `tests/composables/useSuggestFeatureAction.spec.js` — action when specRef present, null when absent.
- [ ] 8.9 `tests/utils/safeMarkdownDompurifyConfig.spec.js` — XSS vector strip suite (script, on*, javascript:, iframe, style).

## 9. JSDoc + documentation

- [ ] 9.1 Every prop, event, slot on the six new SFCs has JSDoc per the three canonical shapes (prop `@type`, event `@event` + `@type`, slot template-comment `@slot`).
- [ ] 9.2 Create `docs/components/cn-features-and-roadmap-link.md`, `features-and-roadmap-view.md`, `features-tab.md`, `roadmap-tab.md`, `roadmap-item.md`, `suggest-feature-modal.md` — purpose, props/events/slots table (auto-generated partial embedded), Backend contract note linking to OR spec, accessibility notes.
- [ ] 9.3 Create `docs/utilities/composables/use-spec-ref.md`, `use-suggest-feature-action.md`, `docs/utilities/safe-markdown-dompurify-config.md`, `docs/utilities/roadmap-label-blocklist.md`.
- [ ] 9.4 Run `cd docusaurus && npm run prebuild:docs` to regenerate `docs/components/_generated/` partials from JSDoc. Commit alongside source.
- [ ] 9.5 Run `npm run jsdoc-baselines:update` and commit the bumped baseline.

## 10. Build + version bump

- [ ] 10.1 Run `npm run build` and confirm Rollup output includes the six new components + two composables + two constants in ESM + CJS bundles.
- [ ] 10.2 Run `npm test` — all unit tests pass.
- [ ] 10.3 Run `npm run check:docs` and `npm run check:jsdoc` — both exit 0.
- [ ] 10.4 Bump `version` in `package.json` (minor — new exports, no breaking changes).

## Verification

- [ ] `openspec validate "add-features-roadmap-menu"` passes
- [ ] `npm test` green
- [ ] `npm run build` green
- [ ] `npm run check:docs` green
- [ ] `npm run check:jsdoc` green
- [ ] All six components importable from `@conduction/nextcloud-vue`
- [ ] No `v-html` on raw user input (only on sanitized HTML output)
- [ ] No hardcoded colors — all via `--color-*` NC CSS variables
- [ ] All HTTP calls use `axios` + `generateUrl` + `encodeURIComponent` on dynamic values
- [ ] EUPL-1.2 SPDX header on every new `.vue` / `.js` file
- [ ] All translatable strings wrap `t('nextcloud-vue', ...)`; `en.json` + `nl.json` updated
