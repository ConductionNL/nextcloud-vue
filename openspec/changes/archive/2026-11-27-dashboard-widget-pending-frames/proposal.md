# Proposal: dashboard-widget-pending-frames

## Why

Decision (Ruben, 27 Nov 2026 09:00 CET): every dashboard widget, in launchpad and in nextcloud-vue's widget hosts,
renders its frame with a loading state at once and loads its content asynchronously, so no widget holds up the first
render of the dashboard; a slow or failing widget shows its own loading or error state.

CnDashboardPage held the whole grid behind one spinner until EVERY conditional widget's `visibleWhen` endpoint had
answered, so one slow condition endpoint delayed every widget on the page.

## What changes

- The grid no longer waits for `widgetConditionsSettled`. A conditional widget without a verdict keeps its cell with a
  loading state (`isPendingWidget`), then shows or leaves when its verdict arrives.

## Impact

- `CnDashboardPage.vue`, `CnDashboardPageBannerCollapse.spec.js`. A widget that turns out hidden now leaves its cell
  after first paint (the rest close up) instead of never appearing; that reflow is the accepted price of not waiting.
