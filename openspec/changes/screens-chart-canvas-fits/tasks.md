# Tasks: screens-chart-canvas-fits

### Task 1: The canvas fits
- **spec_ref**: `openspec/changes/screens-chart-canvas-fits/specs/chart-widget/spec.md#requirement-a-chart-canvas-does-not-scroll`
- **files**: `src/components/CnChartWidget/CnChartWidget.vue`
- [x] Implement: canvas `overflow: hidden`, SVG `display: block`
- [x] Test: e2e `e2e/l7-chart-box-fits.e2e.js` (`?l7=chart-box-fits`); CSS only, no unit test (jsdom computes no layout)
