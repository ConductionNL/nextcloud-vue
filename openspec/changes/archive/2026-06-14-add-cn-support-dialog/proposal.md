# CnSupportDialog — first-open support note + Roadmap "Support" container

## Why

Bookmarks (and many community Nextcloud apps) shows a friendly "would you like to support this project" modal on first open. Conduction has no equivalent across the fleet. We want a single, opt-in widget every Conduction app can pull in from `@conduction/nextcloud-vue` so the experience is:

- consistent in tone (MKB-personal, signed by the founder, Conduction voice),
- consistent in shape (four CTAs in a deliberate priority order),
- one-time per user per app (no nag),
- localized (en + nl),
- and reachable on demand from a 4th container on the shared `CnFeaturesAndRoadmapSidebar`, so users who dismissed the first-open prompt can still get back to it from the roadmap page that every Conduction app already mounts.

The button order intentionally puts **feature requests first** because that is the single most valuable contribution to an early-stage product — the same reasoning that already drives `CnFeaturesAndRoadmapView`. Donation and paid business support come after, in priority order. Paid support copy is framed for organisations, not individuals.

## What changes

1. **New component** — `src/components/CnSupportDialog/CnSupportDialog.vue`. `NcDialog`-based modal with:
   - Title block + body copy (personal note in the Conduction voice).
   - Four `NcButton`s — Suggest a feature (primary), Review on App Store (secondary), Donate (tertiary), Get business support (subtle link-style).
   - Handwritten signature block — "Ruben van der Linde, Founder" — rendered in self-hosted Caveat (latin subset, inlined as base64 inside a scoped `@font-face`, so the dialog stays self-contained and apps don't need to register the font globally).
2. **New composable** — `src/composables/useSupportDialog.js`. Returns `{ visible, show, hide, reset }`, backed by `localStorage["cn-support-dialog-shown:{appSlug}"]`. Auto-marks shown on dismiss; `reset()` for testing / "show again" admin actions.
3. **Roadmap sidebar 4th container** — `CnFeaturesAndRoadmapSidebar` gains a "Support this app" section with a button that emits `@support`. `CnFeaturesAndRoadmapView` listens, mounts `CnSupportDialog` and resets the dismissed flag for that session. Subtitle updated from "Three ways…" to "Four ways…".
4. **Public API** — props (with Conduction defaults):
   - `appName`, `appSlug` — required.
   - `appStoreUrl`, `featureRequestUrl` — required from host (typically the Nextcloud App Store listing + the app's GitHub issues "new feature" template URL).
   - `donateUrl` (default `https://github.com/sponsors/ConductionNL`).
   - `supportUrl` (default `https://www.conduction.nl/contact`).
   - `founderName` (default `Ruben van der Linde`), `founderTitle` (default `Founder`).
5. **i18n** — `l10n/en.json` + `l10n/nl.json` updated with the full body text + four CTA labels. NL mirrors EN.
6. **Docs** — `docs/components/cn-support-dialog.md` with try-it, props/events, and an adoption recipe (`useSupportDialog` + first-open mount).
7. **Tests** — `tests/components/CnSupportDialog.spec.js` covering: mount, button-click emits, dismiss persistence via localStorage, prop defaults, slot fallback.
8. **JSDoc baselines** — `CnSupportDialog: 1` (100% from day one per the new-component contract).

## Non-goals

- Fleet rollout — wiring `CnSupportDialog` into each app's `App.vue` is per-app follow-up work (one issue per app, opened separately).
- Admin "show again for all users" UI — out of scope; `reset()` is exposed for power users / tests.
- Auto-detection of `appStoreUrl` / `featureRequestUrl` from `appinfo.xml` — apps pass props.

## Consumer impact

- Every consumer (OpenRegister, OpenCatalogi, Procest, Pipelinq, LaunchPad, Decidesk, Scholiq, …) gains the components on a single library bump.
- Apps that already mount `CnFeaturesAndRoadmapView` will see the new 4th container automatically once they bump the lib; opening the dialog needs no extra wiring because the view mounts `CnSupportDialog` itself.
- First-open behaviour is opt-in only — host apps call `useSupportDialog(slug)` and mount the dialog where they want.
- CSS bundle grows by ~100 KB (inlined Caveat woff2 latin subset). Justified by the once-per-user UX value; will be revisited if any consumer flags it.

## References

- Reference UX: `bookmarks` app first-open modal (Marcel's "Would you like to support this project?").
- Voice + claims: <https://www.conduction.nl/about/>.
- Adjacent component pattern: `CnFeaturesAndRoadmapView` / `CnFeaturesAndRoadmapSidebar`.
- ADR: ADR-004 (re-export discipline), ADR-022 (i18n nl+en minimum).
