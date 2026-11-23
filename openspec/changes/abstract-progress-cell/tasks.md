# Tasks: abstract-progress-cell

### Task 1: The bar
- **spec_ref**: `openspec/changes/abstract-progress-cell/specs/progress-cell/spec.md#requirement-a-progress-cell-draws-a-toned-bar-with-its-percentage`
- **files**: `src/components/CnCellRenderer/CnCellRenderer.vue`
- [x] Implement: percentage, fallback fields, max, thresholds, lowerIsBetter, dash
- [x] Test: `tests/components/CnCellRendererProgress.spec.js`; e2e `e2e/progress-cell.e2e.js`

### Task 2: The badge
- **spec_ref**: `openspec/changes/abstract-progress-cell/specs/progress-cell/spec.md#requirement-a-progress-cell-can-carry-an-age-badge`
- [x] Implement: dateField, afterDays, when, tone, translated label with {days}
- [x] Test: `tests/components/CnCellRendererProgress.spec.js`

### Task 3: Docs
- [x] `docs/components/cn-cell-renderer.md` section "Progress cells"
