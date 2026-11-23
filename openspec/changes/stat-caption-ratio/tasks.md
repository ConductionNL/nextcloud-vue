# Tasks: stat-caption-ratio

### Task 1: A ratio caption source
- **spec_ref**: `openspec/changes/stat-caption-ratio/specs/stat-widget/spec.md#requirement-a-stat-tiles-caption-can-show-a-share`
- **files**: `src/components/CnStatWidget/CnStatWidget.vue`, `docs/components/cn-stat-widget.md`
- [x] Implement: `captionSource.kind: "ratio"` with `numerator` / `denominator` parts, `{ratio}`, `decimals`
- [x] Test: `tests/components/CnStatWidgetCaptionRatio.spec.js`; e2e `e2e/l16-age-share.e2e.js`
