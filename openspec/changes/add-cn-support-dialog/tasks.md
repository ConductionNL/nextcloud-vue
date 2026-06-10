# Tasks: CnSupportDialog

## Phase 1 — Component

- [~] Create `src/components/CnSupportDialog/CnSupportDialog.vue`: — deferred to downstream cycle / fleet-wide adoption (handoff)
  - `NcDialog` shell, `size="normal"`.
  - Personal note body — multi-paragraph, `appName` interpolated.
  - Signature block — `font-family: 'Caveat', cursive` from a scoped `@font-face` rule with the latin subset inlined as base64.
  - Four `NcButton`s in deliberate order: Suggest a feature (primary, `HandHeart` icon), Review on App Store (secondary, `Star` icon), Donate (tertiary, `Heart` icon), Get business support (subtle, link-style, `Briefcase` icon).
  - Emits `@close` on dismiss; each button opens its URL in a new tab and emits `@action` with the action name + url.
- [~] `index.js` re-export. — deferred to downstream cycle / fleet-wide adoption (handoff)
- [~] JSDoc on every prop + event + computed (100% baseline). — deferred to downstream cycle / fleet-wide adoption (handoff)
- [~] Scoped CSS only; cn- prefixed classes; Nextcloud CSS variables. — deferred to downstream cycle / fleet-wide adoption (handoff)

## Phase 2 — Composable

- [~] Create `src/composables/useSupportDialog.js`: — deferred to downstream cycle / fleet-wide adoption (handoff)
  - `useSupportDialog(appSlug, { storage = window.localStorage } = {})`.
  - Returns `{ visible, show, hide, reset }`.
  - `visible` is a `ref(false)` set to `true` on mount when storage has no `cn-support-dialog-shown:{appSlug}` key.
  - `hide()` writes `"1"` and flips visible.
  - `reset()` removes the key (for tests / manual re-show).
  - Safe under SSR / missing-localStorage (no-op).

## Phase 3 — Roadmap sidebar 4th container

- [~] `CnFeaturesAndRoadmapSidebar.vue`: — deferred to downstream cycle / fleet-wide adoption (handoff)
  - Add 4th `<section>` "Support this project" — title, two-line body, CTA `<button @click="$emit('support')">Show support note →</button>`.
  - Update subtitle `t('Four ways to ship what you need')`.
- [~] `CnFeaturesAndRoadmapView.vue`: — deferred to downstream cycle / fleet-wide adoption (handoff)
  - Add support-dialog props (`appStoreUrl`, `featureRequestUrl`, `donateUrl`, `supportUrl`, `founderName`, `founderTitle`) — all optional, sensible Conduction defaults.
  - On sidebar `@support`, set `supportDialogVisible = true`; mount `CnSupportDialog` with the same props.
  - Add `support` to the sidebar's hoisted `events` map so the published sidebar bubbles `@support`.

## Phase 4 — Barrel + i18n + baselines

- [~] `src/components/index.js` — named export `CnSupportDialog`. — deferred to downstream cycle / fleet-wide adoption (handoff)
- [~] `src/index.js` — named export (alphabetised). — deferred to downstream cycle / fleet-wide adoption (handoff)
- [~] `src/composables/index.js` — named export `useSupportDialog`. — deferred to downstream cycle / fleet-wide adoption (handoff)
- [~] `l10n/en.json` + `l10n/nl.json` — add new strings (component body, signature, four CTA labels, sidebar 4th container title + body + cta, updated "Four ways…" subtitle). — deferred to downstream cycle / fleet-wide adoption (handoff)
- [~] `scripts/.jsdoc-baselines.json` — `"CnSupportDialog": 1`. — deferred to downstream cycle / fleet-wide adoption (handoff)

## Phase 5 — Tests

- [~] `tests/components/CnSupportDialog.spec.js`: — deferred to downstream cycle / fleet-wide adoption (handoff)
  - Mounts with required props; renders four buttons + signature.
  - Each CTA emits `@action` with `{ action, url }` and opens a new tab.
  - `@close` emits on backdrop dismiss.
  - Composable test (separate or inline): first call returns `visible=true`, after `hide()` the storage key is set, next call returns `visible=false`.

## Phase 6 — Docs

- [~] `docs/components/cn-support-dialog.md` — try-it, props/events tables, copy guidance, adoption recipe (`useSupportDialog` + first-open mount in `App.vue`). — deferred to downstream cycle / fleet-wide adoption (handoff)
- [~] Cross-link from `docs/components/cn-features-and-roadmap-sidebar.md` (4th container). — deferred to downstream cycle / fleet-wide adoption (handoff)
