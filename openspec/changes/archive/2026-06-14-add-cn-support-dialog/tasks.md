# Tasks: CnSupportDialog

## Phase 1 — Component

- [x] Create `src/components/CnSupportDialog/CnSupportDialog.vue`:
  - `NcDialog` shell, `size="normal"`.
  - Personal note body — multi-paragraph, `appName` interpolated.
  - Signature block — `font-family: 'Caveat', cursive` from a scoped `@font-face` rule with the latin subset inlined as base64.
  - Four `NcButton`s in deliberate order: Suggest a feature (primary, `HandHeart` icon), Review on App Store (secondary, `Star` icon), Donate (tertiary, `Heart` icon), Get business support (subtle, link-style, `Briefcase` icon).
  - Emits `@close` on dismiss; each button opens its URL in a new tab and emits `@action` with the action name + url.
- [x] `index.js` re-export.
- [x] JSDoc on every prop + event + computed (100% baseline).
- [x] Scoped CSS only; cn- prefixed classes; Nextcloud CSS variables.

## Phase 2 — Composable

- [x] Create `src/composables/useSupportDialog.js`:
  - `useSupportDialog(appSlug, { storage = window.localStorage } = {})`.
  - Returns `{ visible, show, hide, reset }`.
  - `visible` is a `ref(false)` set to `true` on mount when storage has no `cn-support-dialog-shown:{appSlug}` key.
  - `hide()` writes `"1"` and flips visible.
  - `reset()` removes the key (for tests / manual re-show).
  - Safe under SSR / missing-localStorage (no-op).

## Phase 3 — Roadmap sidebar 4th container

- [x] `CnFeaturesAndRoadmapSidebar.vue`:
  - Add 4th `<section>` "Support this project" — title, two-line body, CTA `<button @click="$emit('support')">Show support note →</button>`.
  - Update subtitle `t('Four ways to ship what you need')`.
- [x] `CnFeaturesAndRoadmapView.vue`:
  - Add support-dialog props (`appStoreUrl`, `featureRequestUrl`, `donateUrl`, `supportUrl`, `founderName`, `founderTitle`) — all optional, sensible Conduction defaults.
  - On sidebar `@support`, set `supportDialogVisible = true`; mount `CnSupportDialog` with the same props.
  - Add `support` to the sidebar's hoisted `events` map so the published sidebar bubbles `@support`.

## Phase 4 — Barrel + i18n + baselines

- [x] `src/components/index.js` — named export `CnSupportDialog`.
- [x] `src/index.js` — named export (alphabetised).
- [x] `src/composables/index.js` — named export `useSupportDialog`.
- [x] `l10n/en.json` + `l10n/nl.json` — add new strings (component body, signature, four CTA labels, sidebar 4th container title + body + cta, updated "Four ways…" subtitle).
- [x] `scripts/.jsdoc-baselines.json` — `"CnSupportDialog": 1`.

## Phase 5 — Tests

- [x] `tests/components/CnSupportDialog.spec.js`:
  - Mounts with required props; renders four buttons + signature.
  - Each CTA emits `@action` with `{ action, url }` and opens a new tab.
  - `@close` emits on backdrop dismiss.
  - Composable test (separate or inline): first call returns `visible=true`, after `hide()` the storage key is set, next call returns `visible=false`.

## Phase 6 — Docs

- [x] `docs/components/cn-support-dialog.md` — try-it, props/events tables, copy guidance, adoption recipe (`useSupportDialog` + first-open mount in `App.vue`).
- [x] Cross-link from `docs/components/cn-features-and-roadmap-sidebar.md` (4th container).
