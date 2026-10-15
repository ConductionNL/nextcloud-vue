# Tasks: stat-value-fits

### Task 1: The value fits its tile
- **spec_ref**: `openspec/changes/stat-value-fits/specs/stat-tile-board-look/spec.md#requirement-a-stat-value-shrinks-instead-of-clipping`
- **files**: `src/components/CnStatWidget/CnStatWidget.vue`
- [x] Implement: `fitValue`, ResizeObserver, `MIN_FIT_FONT_SIZE` 14px, wrap at the floor
- [x] Test: `tests/components/CnStatWidgetValueFits.spec.js`
- [x] Test: e2e `e2e/l15-stat-value-fits.e2e.js`

### Task 2: One register label
- **spec_ref**: `openspec/changes/stat-value-fits/specs/register-mapping/spec.md#requirement-the-register-select-has-one-label`
- **files**: `src/components/CnRegisterMapping/CnRegisterMapping.vue`
- [x] Implement: drop the manual label
- [x] Test: `tests/components/CnRegisterMappingCollapsedGroups.spec.js`, e2e `e2e/l15-stat-value-fits.e2e.js`
