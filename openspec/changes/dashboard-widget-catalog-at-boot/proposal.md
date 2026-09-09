---
kind: code
---

# Proposal: dashboard-widget-catalog-at-boot

## Summary

`CnDashboardPage` imports the dashboard widget catalog itself, so a `stat`,
`delta`, `gauge` or `countdown` tile renders on the first page load. Today the
catalog registers only when `CnDetailPage`'s lazy chunk has run, so a
dashboard opened fresh shows "Widget not available" for every registry kind
without a dedicated template branch.

Opened from the dossiq competitor analysis, round 2, placement section 3
(`concurrentie-analyse/procest/_round2/compare/placement.md`) and defect
triage #3 (`concurrentie-analyse/procest/_round2/compare/dossiq-defect-triage.md`),
finding D02. Decision D10 (Ruben, 2026-09-08): proposal now, implementation
separate.

## Motivation

On a fresh load of `/apps/dossiq/`, five `stat` tiles say "Widget not
available" while charts, stats-block and object-tables on the same page
render. Open a case first, then click Dashboard, and all five draw. The
registration module is tree-shaken out of the consumer's build because the
library's `index.js` is not in `sideEffects`; the only importer left is
`CnDetailPage`, a lazy page type (triage #3). Sibling apps guard against it
by calling `registerBuiltinDashboardWidgets()` in `main.js` with a comment
describing the same asymmetry; dossiq never did.

Every competitor's landing page draws its tiles on first load
(`opencase/round2/home-anatomy.md`; `valtimo/round2/dashboard-anatomy.md`;
`xxllnc-zaken/round2/pages/LegacyDashboard.md`). A library trap that turns a
landing page into five error boxes for any app that forgets one line is the
library's to close.

## Affected projects

- `nextcloud-vue`: `CnDashboardPage`, `registerDashboardWidgets.js`,
  `package.json` `sideEffects`, the `dashboard-page` capability.
- Consumers: every app with a manifest dashboard. dossiq, keepiq and hermiq
  stop needing the `main.js` call; apps that keep it are unaffected because
  registration is idempotent.

## Backward compatibility

None broken. Registration runs at most once per catalog entry; a second call
is a no-op. Apps calling `registerBuiltinDashboardWidgets()` keep working.

## Theming

None.
